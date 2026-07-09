/** In-browser background removal (no server, no upload). Uses @imgly's ONNX
 *  model, which is fetched & cached on first use — so the first run can take
 *  a little while, later runs are fast. Lazily imported to keep it out of the
 *  main bundle. */

export async function removeImageBackground(
  source: File | Blob | string,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal')
  return removeBackground(source, {
    output: { format: 'image/png' }, // PNG keeps the transparency
    progress: (_key, current, total) => {
      if (onProgress && total) onProgress(Math.min(1, current / total))
    },
  })
}
