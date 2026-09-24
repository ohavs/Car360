import { requireNativeModule } from 'expo'

declare class CarImageToolsModule {
  /** a local image in, the cut-out subject as a transparent PNG (file URI) out */
  removeBackground(uri: string): Promise<string>
}

export default requireNativeModule<CarImageToolsModule>('CarImageTools')
