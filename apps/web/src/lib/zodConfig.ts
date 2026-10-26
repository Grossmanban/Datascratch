// zod probes `new Function("")` to decide whether to JIT its parsers; under the app's CSP
// (no 'unsafe-eval') that probe is a violation. Jitless parsing never tries it.
import { config } from "zod";

config({ jitless: true });
