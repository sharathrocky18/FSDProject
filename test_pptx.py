from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
slide = prs.slides.add_slide(prs.slide_layouts[6]) # blank layout
print("python-pptx initialized successfully. 16:9 widescreen:", prs.slide_width, prs.slide_height)
