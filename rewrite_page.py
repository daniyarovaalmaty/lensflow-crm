import re

with open("src/app/optic/patients/[id]/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# I will write a script to extract the blocks and reassemble them
# Or maybe simpler: the file is 1074 lines. I will write a python script that
# reads the file, finds the exact HTML parts to replace and builds the new page.

# Wait, the easiest way is to use Antigravity's tools. I'll just use a python script that writes the exact content.
