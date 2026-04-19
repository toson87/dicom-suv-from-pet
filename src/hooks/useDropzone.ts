import { useCallback, useEffect, useRef, useState } from 'react'

async function traverseFileEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return await new Promise<File[]>((resolve, reject) => {
      ;(entry as FileSystemFileEntry).file(
        f => resolve([f]),
        err => reject(err),
      )
    })
  }
  const dirReader = (entry as FileSystemDirectoryEntry).createReader()
  const all: FileSystemEntry[] = []
  while (true) {
    const batch: FileSystemEntry[] = await new Promise((resolve, reject) =>
      dirReader.readEntries(resolve, reject),
    )
    if (batch.length === 0) break
    all.push(...batch)
  }
  const nested = await Promise.all(all.map(traverseFileEntry))
  return nested.flat()
}

export interface DropzoneOptions {
  onFiles: (files: File[]) => void
}

export function useDropzone({ onFiles }: DropzoneOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dragDepth = useRef(0)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    if (e.dataTransfer?.types.includes('Files')) setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragDepth.current = 0
      setIsDragging(false)

      if (!e.dataTransfer) return

      const items = e.dataTransfer.items
      const collected: File[] = []

      if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
        const entries: (FileSystemEntry | null)[] = []
        for (let i = 0; i < items.length; i++) entries.push(items[i].webkitGetAsEntry())
        for (const entry of entries) {
          if (!entry) continue
          collected.push(...await traverseFileEntry(entry))
        }
      } else if (e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) collected.push(e.dataTransfer.files[i])
      }

      if (collected.length > 0) onFiles(collected)
    },
    [onFiles],
  )

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover',  handleDragOver)
    window.addEventListener('drop',      handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover',  handleDragOver)
      window.removeEventListener('drop',      handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return
      const arr: File[] = []
      for (let i = 0; i < files.length; i++) arr.push(files[i])
      if (arr.length > 0) onFiles(arr)
      e.target.value = ''
    },
    [onFiles],
  )

  const openFolderPicker = useCallback(() => inputRef.current?.click(), [])

  return { isDragging, inputRef, handleInputChange, openFolderPicker }
}
