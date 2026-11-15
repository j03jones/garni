package page.garni;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Holds a link or text shared to Garni (Share › Garni) until the web app asks for it (web/js/native.js). */
@CapacitorPlugin(name = "GarniShare")
public class GarniSharePlugin extends Plugin {
    private static String pending = null;

    static synchronized void keep(String json) { pending = json; }

    @PluginMethod
    public void take(PluginCall call) {
        JSObject out = new JSObject();
        synchronized (GarniSharePlugin.class) {
            out.put("value", pending == null ? "" : pending);
            pending = null;
        }
        call.resolve(out);
    }
}
