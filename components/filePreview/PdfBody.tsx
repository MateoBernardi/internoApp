import * as FileSystem from 'expo-file-system';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  uri: string;
  /** Used as a hint to name the cached copy. */
  name: string;
}

function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

/**
 * HTML that renders a base64 PDF entirely on-device with pdf.js.
 * The document bytes are inlined (already downloaded by RN), so nothing is
 * uploaded to a third party — only the pdf.js library loads from a CDN.
 */
function buildPdfHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes" />
<style>
  html,body{margin:0;padding:0;background:#0e1216;}
  #pages{padding:8px 0;}
  canvas{display:block;margin:0 auto 8px;max-width:100%;box-shadow:0 1px 6px rgba(0,0,0,0.4);}
  #err{color:#fff;font-family:-apple-system,Roboto,sans-serif;font-size:14px;text-align:center;padding:32px;}
</style>
</head>
<body>
<div id="pages"></div>
<div id="err" style="display:none">No se pudo mostrar el PDF</div>
<script src="${PDFJS}/pdf.min.js"></script>
<script>
  var B64 = "${base64}";
  function post(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m); }
  function b64ToBytes(b64){
    var bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
    for (var i=0;i<len;i++) bytes[i]=bin.charCodeAt(i);
    return bytes;
  }
  (function(){
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "${PDFJS}/pdf.worker.min.js";
      var dpr = window.devicePixelRatio || 1;
      pdfjsLib.getDocument({ data: b64ToBytes(B64) }).promise.then(function(pdf){
        var pages = document.getElementById('pages');
        var chain = Promise.resolve();
        for (var p = 1; p <= pdf.numPages; p++) {
          (function(pageNum){
            chain = chain.then(function(){
              return pdf.getPage(pageNum).then(function(page){
                var base = page.getViewport({ scale: 1 });
                var scale = (window.innerWidth * dpr) / base.width;
                var vp = page.getViewport({ scale: scale });
                var canvas = document.createElement('canvas');
                canvas.width = vp.width; canvas.height = vp.height;
                canvas.style.width = (vp.width / dpr) + 'px';
                pages.appendChild(canvas);
                return page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
              });
            });
          })(p);
        }
        return chain;
      }).then(function(){ post('ready'); }).catch(function(e){
        document.getElementById('err').style.display='block';
        post('error:' + (e && e.message ? e.message : 'render'));
      });
    } catch (e) {
      document.getElementById('err').style.display='block';
      post('error:' + (e && e.message ? e.message : 'init'));
    }
  })();
</script>
</body>
</html>`;
}

export function PdfBody({ uri, name }: Props) {
  // iOS WKWebView renders a PDF URL natively (with its own pan/zoom).
  if (Platform.OS === 'ios') {
    return (
      <WebView
        source={{ uri }}
        style={styles.web}
        originWhitelist={['*']}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      />
    );
  }
  return <AndroidPdf uri={uri} name={name} />;
}

function AndroidPdf({ uri, name }: Props) {
  const [base64, setBase64] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dir = new FileSystem.Directory(FileSystem.Paths.cache, 'filePreview');
        dir.create({ idempotent: true, intermediates: true });
        const file = new FileSystem.File(dir, safeName(name));
        if (!file.exists) {
          await FileSystem.File.downloadFileAsync(uri, file, { idempotent: true });
        }
        const data = await file.base64();
        if (!cancelled) setBase64(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [uri, name]);

  const html = useMemo(() => (base64 ? buildPdfHtml(base64) : null), [base64]);

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.errText}>No se pudo cargar el PDF</Text>
      </View>
    );
  }
  if (!html) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  return (
    <WebView
      source={{ html, baseUrl: PDFJS }}
      style={styles.web}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      onMessage={(e) => {
        if (e.nativeEvent.data.startsWith('error:')) setFailed(true);
      }}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#0e1216' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0e1216' },
  errText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
