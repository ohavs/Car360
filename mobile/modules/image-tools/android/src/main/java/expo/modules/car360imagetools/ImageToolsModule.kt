package expo.modules.car360imagetools

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import com.google.mlkit.common.MlKitException
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

/**
 * "Remove background" for the car photo, on the device: ML Kit subject
 * segmentation cuts the car out, then the result is trimmed to the car so it
 * fills the frame like the web app's transparent car images.
 */
class ImageToolsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CarImageTools")

    AsyncFunction("removeBackground") { uri: String, promise: Promise ->
      val image = runCatching { InputImage.fromFilePath(context, Uri.parse(uri)) }.getOrNull()
      if (image == null) {
        promise.reject("ERR_READ", "Could not read the image", null)
      } else {
        segment(image, promise)
      }
    }
  }

  private fun segment(image: InputImage, promise: Promise) {
      val segmenter = SubjectSegmentation.getClient(
        SubjectSegmenterOptions.Builder().enableForegroundBitmap().build()
      )
      segmenter.process(image)
        .addOnSuccessListener { result ->
          val foreground = result.foregroundBitmap
          if (foreground == null) {
            promise.reject("ERR_NO_SUBJECT", "No subject found in the image", null)
          } else {
            try {
              val out = File(context.cacheDir, "car360-cutout-${System.currentTimeMillis()}.png")
              FileOutputStream(out).use { trim(foreground).compress(Bitmap.CompressFormat.PNG, 100, it) }
              promise.resolve(Uri.fromFile(out).toString())
            } catch (e: Exception) {
              promise.reject("ERR_SAVE", "Could not save the result: ${e.message}", e)
            }
          }
          segmenter.close()
        }
        .addOnFailureListener { e ->
          val code = if (e is MlKitException && e.errorCode == MlKitException.UNAVAILABLE) "ERR_MODEL_DOWNLOADING" else "ERR_SEGMENT"
          promise.reject(code, e.message ?: "Segmentation failed", e)
          segmenter.close()
        }
  }

  /** Crop to the non-transparent pixels, with a small margin. */
  private fun trim(bitmap: Bitmap): Bitmap {
    val w = bitmap.width
    val h = bitmap.height
    val pixels = IntArray(w * h)
    bitmap.getPixels(pixels, 0, w, 0, 0, w, h)
    var minX = w
    var minY = h
    var maxX = -1
    var maxY = -1
    for (y in 0 until h) {
      val row = y * w
      for (x in 0 until w) {
        if ((pixels[row + x] ushr 24) > 16) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < minX || maxY < minY) return bitmap
    val margin = (maxOf(maxX - minX, maxY - minY) * 0.04).toInt()
    val left = maxOf(0, minX - margin)
    val top = maxOf(0, minY - margin)
    val right = minOf(w - 1, maxX + margin)
    val bottom = minOf(h - 1, maxY + margin)
    return Bitmap.createBitmap(bitmap, left, top, right - left + 1, bottom - top + 1)
  }
}
