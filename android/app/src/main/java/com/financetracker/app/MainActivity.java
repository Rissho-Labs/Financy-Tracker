package com.financetracker.app;

import android.os.Bundle;
import android.webkit.ConsoleMessage;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Ativa debug WebView e impede que mensagens com segredos
 * (password/token) sejam escritas no logcat via Capacitor/Console.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WebView.setWebContentsDebuggingEnabled(true);

    Bridge bridge = getBridge();
    if (bridge != null && bridge.getWebView() != null) {
      bridge.getWebView().setWebChromeClient(new SecureChromeClient(bridge));
    }
  }

  private static final class SecureChromeClient extends BridgeWebChromeClient {
    SecureChromeClient(Bridge bridge) {
      super(bridge);
    }

    @Override
    public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
      if (consoleMessage != null && consoleMessage.message() != null) {
        if (containsSecret(consoleMessage.message())) {
          // Bloqueia o vazamento no logcat; não chama super.
          return true;
        }
      }
      return super.onConsoleMessage(consoleMessage);
    }

    private static boolean containsSecret(String msg) {
      String m = msg.toLowerCase();
      return m.contains("\"password\"")
          || m.contains("\"secret\"")
          || m.contains("\"idtoken\"")
          || m.contains("\"refreshtoken\"")
          || m.contains("\"accesstoken\"")
          || m.contains("password=")
          || m.contains("bearer ");
    }
  }
}
