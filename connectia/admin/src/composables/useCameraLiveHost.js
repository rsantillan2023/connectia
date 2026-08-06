import { nextTick, onUnmounted, ref, watch } from 'vue'
import api from '../services/api'

/**
 * Host WebRTC (mesh 1→N): cámara del admin → viewers vía señalización HTTP.
 */
export function useCameraLiveHost() {
  const live = ref(null)
  const localStream = ref(null)
  const previewEl = ref(null)
  const broadcasting = ref(false)
  const peerCount = ref(0)
  const error = ref('')
  const muted = ref(false)
  const cameraOff = ref(false)

  const peers = new Map()
  const pendingIceByPeer = new Map()
  let iceServers = []
  let pollTimer = null
  let handlingOffer = new Set()

  function bindPreview(el = previewEl.value) {
    const video = el || previewEl.value
    const stream = localStream.value
    if (!video || !stream) return false
    try {
      if (video.srcObject !== stream) {
        video.srcObject = stream
      }
      video.muted = true
      video.defaultMuted = true
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', '')
      const playPromise = video.play?.()
      if (playPromise?.catch) playPromise.catch(() => {})
      return true
    } catch {
      return false
    }
  }

  async function bindPreviewSoon() {
    await nextTick()
    bindPreview()
    requestAnimationFrame(() => bindPreview())
    setTimeout(() => bindPreview(), 80)
    setTimeout(() => bindPreview(), 250)
  }

  watch([localStream, previewEl], () => {
    if (localStream.value && previewEl.value) bindPreview()
  })

  async function start({ title, liveId } = {}) {
    error.value = ''
    if (!liveId) {
      error.value = 'Creá primero una emisión En vivo'
      throw new Error(error.value)
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      localStream.value = stream
      await bindPreviewSoon()

      const { data } = await api.post('/admin/live/camera/start', {
        liveId,
        title: title || 'Mensaje en vivo',
        audience: { mode: 'all' },
      })
      live.value = data.live
      iceServers = data.iceServers || []
      broadcasting.value = true
      peerCount.value = data.live?.peerCount || 0
      await bindPreviewSoon()
      startPolling()
      return data.live
    } catch (e) {
      stopLocalTracks()
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Permiso de cámara/mic denegado'
          : e?.response?.data?.error || e?.message || 'No se pudo iniciar'
      error.value = msg
      throw e
    }
  }

  async function stop() {
    stopPolling()
    closePeers()
    if (live.value?.id) {
      try {
        await api.post(`/admin/live/camera/${live.value.id}/stop`)
      } catch {
        /* ignore */
      }
    }
    stopLocalTracks()
    live.value = null
    broadcasting.value = false
    peerCount.value = 0
  }

  function stopLocalTracks() {
    localStream.value?.getTracks?.().forEach((t) => t.stop())
    localStream.value = null
    if (previewEl.value) {
      try {
        previewEl.value.srcObject = null
      } catch {
        /* ignore */
      }
    }
  }

  function closePeers() {
    for (const pc of peers.values()) {
      try {
        pc.close()
      } catch {
        /* ignore */
      }
    }
    peers.clear()
    pendingIceByPeer.clear()
    handlingOffer.clear()
  }

  function setMuted(v) {
    muted.value = Boolean(v)
    localStream.value?.getAudioTracks?.().forEach((t) => {
      t.enabled = !muted.value
    })
  }

  function setCameraOff(v) {
    cameraOff.value = Boolean(v)
    localStream.value?.getVideoTracks?.().forEach((t) => {
      t.enabled = !cameraOff.value
    })
  }

  function startPolling() {
    stopPolling()
    const tick = async () => {
      if (!live.value?.id || !broadcasting.value) return
      try {
        const { data } = await api.get(`/admin/live/camera/${live.value.id}/signals`)
        if (data.liveEnded) {
          await stop()
          error.value = 'La emisión terminó'
          return
        }
        peerCount.value = data.peerCount ?? peerCount.value
        for (const sig of data.signals || []) {
          try {
            if (sig.kind === 'offer') await handleOffer(sig.peerId, sig.payload)
            else if (sig.kind === 'ice-viewer') await handleRemoteIce(sig.peerId, sig.payload)
          } catch (e) {
            console.warn('[live-host] signal', sig.kind, e)
          }
        }
      } catch (e) {
        if (e?.response?.status === 404) {
          await stop()
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

  async function handleOffer(peerId, sdp) {
    if (!localStream.value || !live.value?.id || !peerId || !sdp) return
    if (handlingOffer.has(peerId)) return

    const existing = peers.get(peerId)
    if (existing) {
      const st = existing.connectionState
      if (st === 'connected' || st === 'connecting') return
      try {
        existing.close()
      } catch {
        /* ignore */
      }
      peers.delete(peerId)
    }

    handlingOffer.add(peerId)
    try {
      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 4,
      })
      peers.set(peerId, pc)

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !live.value?.id) return
        api
          .post(`/admin/live/camera/${live.value.id}/ice`, {
            peerId,
            candidate: ev.candidate.toJSON ? ev.candidate.toJSON() : ev.candidate,
          })
          .catch(() => {})
      }
      pc.onconnectionstatechange = () => {
        // No cortar en "disconnected": en local suele ser un flicker y deja la pantalla negra.
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          peers.delete(peerId)
          pendingIceByPeer.delete(peerId)
          handlingOffer.delete(peerId)
          try {
            pc.close()
          } catch {
            /* ignore */
          }
        }
      }

      for (const track of localStream.value.getTracks()) {
        pc.addTrack(track, localStream.value)
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp))

      const queued = pendingIceByPeer.get(peerId) || []
      pendingIceByPeer.delete(peerId)
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c)
        } catch {
          /* ignore */
        }
      }

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await api.post(`/admin/live/camera/${live.value.id}/answer`, {
        peerId,
        sdp: { type: answer.type, sdp: answer.sdp },
      })
    } finally {
      handlingOffer.delete(peerId)
    }
  }

  async function handleRemoteIce(peerId, candidate) {
    if (!candidate) return
    const pc = peers.get(peerId)
    if (!pc || !pc.remoteDescription) {
      const q = pendingIceByPeer.get(peerId) || []
      q.push(candidate)
      pendingIceByPeer.set(peerId, q)
      return
    }
    try {
      await pc.addIceCandidate(candidate)
    } catch {
      /* ignore */
    }
  }

  onUnmounted(() => {
    // Si se sale de la pantalla Live, cortar bien (si no, la app U ve la emisión pero sin host).
    if (broadcasting.value && live.value?.id) {
      stop().catch(() => {
        stopPolling()
        closePeers()
        stopLocalTracks()
      })
    } else {
      stopPolling()
      closePeers()
      stopLocalTracks()
    }
  })

  return {
    live,
    localStream,
    previewEl,
    broadcasting,
    peerCount,
    error,
    muted,
    cameraOff,
    start,
    stop,
    setMuted,
    setCameraOff,
    bindPreview,
    bindPreviewSoon,
  }
}
