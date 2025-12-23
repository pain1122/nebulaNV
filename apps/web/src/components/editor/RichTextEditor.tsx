import dynamic from "next/dynamic"

const RichTextEditor = dynamic(() => import("./RichTextEditor.client"), {
  ssr: false,
  loading: () => <div className="py-2">Loading editor…</div>,
})

export default RichTextEditor
