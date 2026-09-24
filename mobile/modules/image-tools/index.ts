import { requireNativeModule } from 'expo'

declare class CarImageToolsModule {
  /** a local image in, the cut-out subject as a transparent PNG (file URI) out */
  removeBackground(uri: string): Promise<string>
  /** the first `maxPages` pages of a PDF as JPEG files (URIs), `width` px wide */
  renderPdf(uri: string, maxPages: number, width: number): Promise<string[]>
}

export default requireNativeModule<CarImageToolsModule>('CarImageTools')
