<script>
import { defineComponent, h } from 'vue'
import { getHubIconNodes } from '../utils/hubIconPaths'

export default defineComponent({
  name: 'HubIcon',
  props: {
    name: { type: String, default: 'circle' },
    size: { type: [Number, String], default: 20 },
  },
  setup(props) {
    return () => {
      const px = Number(props.size) || 20
      const nodes = getHubIconNodes(props.name)
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          width: px,
          height: px,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.75,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
        },
        nodes.map(([tag, attrs]) => h(tag, attrs)),
      )
    }
  },
})
</script>
