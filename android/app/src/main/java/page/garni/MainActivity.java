package page.garni;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GarniSharePlugin.class);
        super.onCreate(savedInstanceState);
        keepShared(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Garni was already open: tell the page there's something to pick up
        if (keepShared(intent) && getBridge() != null) getBridge().triggerWindowJSEvent("garnishare");
    }

    /** Keeps a shared link or text (Share › Garni) for the web app to collect. */
    private boolean keepShared(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return false;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (text == null || text.isEmpty()) return false;
        try {
            JSONObject o = new JSONObject();
            String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            o.put("title", subject == null ? "" : subject);
            o.put("text", text);
            GarniSharePlugin.keep(o.toString());
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
