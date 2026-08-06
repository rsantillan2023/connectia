import { onUnmounted, ref } from 'vue'
import api from '../services/api'

/**
 * Viewer WebRTC: recibe stream de cámara del admin (señalización HTTP).
 */
export function useCameraLiveViewer() {
  const connected = ref(false)
  const connecting = ref(false)
  const error = ref('')
  const videoEl = ref(null)

  let pc = null
  let peerId = null
  let liveId = null
  let pollTimer = null
  let remoteStream = null
  let pendingHostIce = []
  let wantMuted = true

  function attachRemoteToVideo() {
    const el = videoEl.value
    if (!el || !remoteStream) return false
    try {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream
      }
      el.muted = wantMuted
      el.defaultMuted = wantMuted
      el.playsInline = true
      el.setAttribute('playsinline', '')
      el.setAttribute('webkit-playsinline', '')
      const p = el.play?.()
      if (p?.catch) p.catch(() => {})
      return true
    } catch {
      return false
    }
  }

  function setMutedPreference(muted) {
    wantMuted = Boolean(muted)
    attachRemoteToVideo()
  }

  async function connect(live) {
    await disconnect()
    error.value = ''
    if (!live?.id || live.source !== 'camera') return
    connecting.value = true
    liveId = live.id
    pendingHostIce = []
    try {
      const { data: join } = await api.post(`/live/${liveId}/webrtc/join`)
      peerId = join.peerId
      const iceServers = join.iceServers || []

      pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 4,
      })
      remoteStream = new MediaStream()

      pc.ontrack = (ev) => {
        if (ev.streams?.[0]) {
          remoteStream = ev.streams[0]
        } else if (ev.track) {
          const has = remoteStream.getTracks().some((t) => t.id === ev.track.id)
          if (!has) remoteStream.addTrack(ev.track)
        }
        attachRemoteToVideo()
        // Reintentos: el <video> a veces monta después del primer frame
        requestAnimationFrame(() => attachRemoteToVideo())
        setTimeout(() => attachRemoteToVideo(), 100)
        setTimeout(() => attachRemoteToVideo(), 400)
      }
      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !peerId) return
        api
          .post(`/live/${liveId}/webrtc/ice`, {
            peerId,
            candidate: ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate,
          })
          .catch(() => {})
      }
      pc.onconnectionstatechange = () => {
        connected.value = pc?.connectionState === 'connected'
        if (pc?.connectionState === 'failed') {
          error.value = 'No se pudo conectar al vivo. Recargá o volvé a elegir la emisión.'
        }
      }

      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await api.post(`/live/${liveId}/webrtc/offer`, {
        peerId,
        sdp: { type: offer.type, sdp: offer.sdp },
      })

      startPolling()
      connecting.value = false
      attachRemoteToVideo()
    } catch (e) {
      connecting.value = false
      error.value = e?.response?.data?.error || e?.message || 'No se pudo conectar'
      await disconnect()
    }
  }

  function startPolling() {
    stopPolling()
    const tick = async () => {
      if (!liveId || !peerId || !pc) return
      try {
        const { data } = await api.get(`/live/${liveId}/webrtc/signals/${peerId}`)
        if (data.liveEnded) {
          error.value = 'La emisión terminó'
          await disconnect()
          return
        }
        for (const sig of data.signals || []) {
          if (sig.kind === 'answer' && sig.payload) {
            if (!pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.payload))
              for (const c of pendingHostIce) {
                try {
                  await pc.addIceCandidate(c)
                } catch {
                  /* ignore */
                }
              }
              pendingHostIce = []
              attachRemoteToVideo()
            }
          } else if (sig.kind === 'ice-host' && sig.payload) {
            try {
              if (pc.remoteDescription) await pc.addIceCandidate(sig.payload)
              else pendingHostIce.push(sig.payload)
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e) {
        if (e?.response?.status === 404) {
          error.value = 'Emisión no disponible'
          await disconnect()
        }
      }
    }
    tick()
    pollTimer = setInterval(tick, 700)
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }

  async function disconnect() {
    stopPolling()
    try {
      pc?.close()
    } catch {
      /* ignore */
    }
    pc = null
    peerId = null
    liveId = null
    connected.value = false
    connecting.value = false
    if (videoEl.value) {
      try {
        videoEl.value.srcObject = null
      } catch {
        /* ignore */
      }
    }
    remoteStream = null
  }

  function bindVideo() {
    attachRemoteToVideo()
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    connecting,
    error,
    videoEl,
    connect,
    disconnect,
    bindVideo,
    setMutedPreference,
  }
}
