package io.github.cup113.etch;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  // 返回手势/返回键：WebView 有历史（SPA 用 pushState 导航，返回栈非空）时后退一页；
  // 处于首页、无历史时才退出应用（安卓惯例）。本项目未启用 predictive back
  // （AndroidManifest 未设 android:enableOnBackInvokedCallback），经典返回路径走
  // OnBackPressedDispatcher 的回调，两条路径均兼容。
  // 已知限制：浮层（如设置抽屉）打开时，返回仍走页面导航而非关闭浮层。
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    getOnBackPressedDispatcher()
        .addCallback(
            this,
            new OnBackPressedCallback(true) {
              @Override
              public void handleOnBackPressed() {
                WebView webView = bridge != null ? bridge.getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                  webView.goBack();
                } else {
                  finish();
                }
              }
            });
  }
}
