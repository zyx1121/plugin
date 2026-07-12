#!/usr/bin/env python3
# No-op shim. The scriptorium engine was retired in 19b2a1b (plugin 0.3.0),
# but sessions started before that carry a stale hook registration pointing
# here. This silences those sessions; safe to delete once no old session runs.
import sys
sys.exit(0)
