import React from "react"
import { Textarea, type TextareaProps } from "@/components/ui/textarea"

const MemoizedTextarea = React.memo(function MemoizedTextarea(props: TextareaProps) {
  return <Textarea {...props} />
})

export default MemoizedTextarea
