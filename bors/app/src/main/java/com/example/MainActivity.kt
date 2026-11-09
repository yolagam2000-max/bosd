package com.example

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.ui.theme.MyApplicationTheme
import java.io.File
import org.json.JSONArray

class MainActivity : ComponentActivity() {

  private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
  private var cameraCaptureUri: Uri? = null

  private val fileChooserLauncher =
      registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (fileChooserCallback != null) {
          val clipData = result.data?.clipData
          val dataString = result.data?.dataString
          val results: Array<Uri>? =
              when {
                clipData != null -> {
                  Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                }
                dataString != null -> arrayOf(Uri.parse(dataString))
                result.resultCode == RESULT_OK && cameraCaptureUri != null -> {
                  arrayOf(cameraCaptureUri!!)
                }
                else -> null
              }
          fileChooserCallback?.onReceiveValue(results)
          fileChooserCallback = null
        }
      }

  fun launchFileChooser(callback: ValueCallback<Array<Uri>>?, acceptTypes: Array<String>?) {
    fileChooserCallback?.onReceiveValue(null)
    fileChooserCallback = callback

    val getContentIntent =
        Intent(Intent.ACTION_GET_CONTENT).apply {
          addCategory(Intent.CATEGORY_OPENABLE)
          type = "image/*"
          if (acceptTypes != null && acceptTypes.isNotEmpty()) {
            putExtra(Intent.EXTRA_MIME_TYPES, acceptTypes)
          }
          putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
        }

    val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
      putExtra(Intent.EXTRA_INTENT, getContentIntent)
      putExtra(Intent.EXTRA_TITLE, "Ambil Foto Kamera atau Pilih dari Galeri")
    }

    try {
      val values = ContentValues().apply {
        put(MediaStore.Images.Media.TITLE, "BoraScan_Scan_${System.currentTimeMillis()}.jpg")
        put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
      }
      cameraCaptureUri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
      if (cameraCaptureUri != null) {
        val takePhotoIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
          putExtra(MediaStore.EXTRA_OUTPUT, cameraCaptureUri)
        }
        chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(takePhotoIntent))
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }

    fileChooserLauncher.launch(chooserIntent)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        BoraScanApp(
            activity = this,
            onLaunchFileChooser = { cb, types -> launchFileChooser(cb, types) })
      }
    }
  }
}

class BoraScanJsInterface(private val context: Context) {
  @JavascriptInterface
  fun vibrate(patternJson: String) {
    try {
      val jsonArray = JSONArray(patternJson)
      val timings = LongArray(jsonArray.length())
      for (i in 0 until jsonArray.length()) {
        timings[i] = jsonArray.getLong(i)
      }

      val vibrator =
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager =
                context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
          } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
          }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        if (timings.size == 1) {
          vibrator.vibrate(
              VibrationEffect.createOneShot(timings[0], VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
          vibrator.vibrate(VibrationEffect.createWaveform(timings, -1))
        }
      } else {
        @Suppress("DEPRECATION") vibrator.vibrate(timings, -1)
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  @JavascriptInterface
  fun saveImage(base64Data: String, filename: String): Boolean {
    return try {
      val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
      val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
      val mimeType = if (filename.lowercase().endsWith(".png")) "image/png" else "image/jpeg"

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val values = ContentValues().apply {
          put(MediaStore.Images.Media.DISPLAY_NAME, filename)
          put(MediaStore.Images.Media.MIME_TYPE, mimeType)
          put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/BoraScan")
          put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
        if (uri != null) {
          context.contentResolver.openOutputStream(uri)?.use { os ->
            os.write(bytes)
          }
          values.clear()
          values.put(MediaStore.Images.Media.IS_PENDING, 0)
          context.contentResolver.update(uri, values, null, null)
        }
      } else {
        @Suppress("DEPRECATION")
        val picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
        val appDir = File(picturesDir, "BoraScan").apply { mkdirs() }
        val file = File(appDir, filename)
        file.writeBytes(bytes)
        MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
      }

      Handler(Looper.getMainLooper()).post {
        Toast.makeText(
          context,
          "✓ Kartu BoraScan berhasil disimpan ke Galeri ($filename)",
          Toast.LENGTH_LONG
        ).show()
      }
      true
    } catch (e: Exception) {
      e.printStackTrace()
      Handler(Looper.getMainLooper()).post {
        Toast.makeText(
          context,
          "Gagal menyimpan kartu: ${e.message}",
          Toast.LENGTH_SHORT
        ).show()
      }
      false
    }
  }

  @JavascriptInterface
  fun savePdf(base64Data: String, filename: String): Boolean {
    return try {
      val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
      val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val values = ContentValues().apply {
          put(MediaStore.Downloads.DISPLAY_NAME, filename)
          put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
          put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/BoraScan")
        }
        val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
        if (uri != null) {
          context.contentResolver.openOutputStream(uri)?.use { os ->
            os.write(bytes)
          }
        }
      } else {
        @Suppress("DEPRECATION")
        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        val appDir = File(downloadsDir, "BoraScan").apply { mkdirs() }
        val file = File(appDir, filename)
        file.writeBytes(bytes)
        MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf("application/pdf"), null)
      }

      Handler(Looper.getMainLooper()).post {
        Toast.makeText(
          context,
          "✓ Template PDF Kartu berhasil disimpan ke Download ($filename)",
          Toast.LENGTH_LONG
        ).show()
      }
      true
    } catch (e: Exception) {
      e.printStackTrace()
      Handler(Looper.getMainLooper()).post {
        Toast.makeText(
          context,
          "Gagal menyimpan PDF: ${e.message}",
          Toast.LENGTH_SHORT
        ).show()
      }
      false
    }
  }

  @JavascriptInterface
  fun getGeminiApiKey(): String {
    return try {
      val field = BuildConfig::class.java.getField("GEMINI_API_KEY")
      field.get(null) as? String ?: ""
    } catch (e: Exception) {
      ""
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun BoraScanApp(
    activity: ComponentActivity,
    onLaunchFileChooser: (ValueCallback<Array<Uri>>?, Array<String>?) -> Unit
) {
  val context = LocalContext.current
  var hasCameraPermission by remember {
    mutableStateOf(
        ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED)
  }

  val permissionLauncher =
      rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
        hasCameraPermission = isGranted
      }

  LaunchedEffect(Unit) {
    if (!hasCameraPermission) {
      permissionLauncher.launch(Manifest.permission.CAMERA)
    }
  }

  var webViewInstance by remember { mutableStateOf<WebView?>(null) }

  BackHandler(enabled = webViewInstance?.canGoBack() == true) { webViewInstance?.goBack() }

  Scaffold(modifier = Modifier.fillMaxSize().testTag("borascan_scaffold")) { innerPadding ->
    Box(modifier = Modifier.fillMaxSize().statusBarsPadding().testTag("borascan_webview_container")) {
      AndroidView(
          modifier = Modifier.fillMaxSize().testTag("borascan_webview"),
          factory = { ctx ->
            WebView(ctx).apply {
              settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                @Suppress("DEPRECATION")
                allowFileAccessFromFileURLs = true
                @Suppress("DEPRECATION")
                allowUniversalAccessFromFileURLs = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
              }

              addJavascriptInterface(BoraScanJsInterface(ctx), "Android")

              webChromeClient =
                  object : WebChromeClient() {
                    override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                      android.util.Log.d("BoraScanWeb", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()}")
                      return true
                    }

                    override fun onPermissionRequest(request: PermissionRequest?) {
                      request?.grant(request.resources)
                    }

                    override fun onShowFileChooser(
                        webView: WebView?,
                        filePathCallback: ValueCallback<Array<Uri>>?,
                        fileChooserParams: FileChooserParams?
                    ): Boolean {
                      onLaunchFileChooser(filePathCallback, fileChooserParams?.acceptTypes)
                      return true
                    }
                  }

              webViewClient =
                  object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        view: WebView?,
                        url: String?
                    ): Boolean {
                      if (url == null) return false

                      // Handle WhatsApp and external links
                      if (url.startsWith("https://wa.me") ||
                          url.startsWith("whatsapp://") ||
                          url.startsWith("mailto:") ||
                          url.startsWith("tel:")) {
                        try {
                          val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                          ctx.startActivity(intent)
                          return true
                        } catch (e: Exception) {
                          e.printStackTrace()
                        }
                      }
                      return false
                    }
                  }

              setDownloadListener { url, _, _, mimetype, _ ->
                if (url != null && url.startsWith("data:")) {
                  val isPdf = mimetype?.contains("pdf") == true || url.startsWith("data:application/pdf")
                  val filename = if (isPdf) "BoraScan_Card_v2_85x55mm.pdf" else "BoraScan_Card_v2_85x55mm.png"
                  if (isPdf) {
                    BoraScanJsInterface(ctx).savePdf(url, filename)
                  } else {
                    BoraScanJsInterface(ctx).saveImage(url, filename)
                  }
                }
              }

              loadUrl("file:///android_asset/web/index.html")
              webViewInstance = this
            }
          })
    }
  }
}
