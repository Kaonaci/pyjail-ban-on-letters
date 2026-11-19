from .mappers.ascii_to_bold_italic_unicode import AsciiToBoldItalicUnicodeMapper
from .mappers.ascii_to_bold_script_unicode import AsciiToBoldScriptUnicodeMapper
from .mappers.ascii_to_bold_unicode import AsciiToBoldUnicodeMapper
from .mappers.ascii_to_italic_unicode import AsciiToItalicUnicodeMapper
from .mappers.ascii_to_oct import AsciiToOctMapper
from .mappers.ascii_to_script_unicode import AsciiToScriptUnicodeMapper
from .mappers.ascii_to_unicode import AsciiToUnicodeMapper

mapper_configs = [
    {
        "name": "ascii-to-unicode",
        "mapper": AsciiToUnicodeMapper,
        "shown_name": "ASCII to Unicode",
        "description": "Convert ASCII characters to Unicode equivalents",
    },
    {
        "name": "ascii-to-oct",
        "mapper": AsciiToOctMapper,
        "shown_name": "ASCII to Octal",
        "description": "Convert ASCII characters to octal escape sequences",
    },
    {
        "name": "ascii-to-bold-unicode",
        "mapper": AsciiToBoldUnicodeMapper,
        "shown_name": "ASCII to Bold Unicode",
        "description": "Convert ASCII characters to Bold Unicode equivalents",
    },
    {
        "name": "ascii-to-italic-unicode",
        "mapper": AsciiToItalicUnicodeMapper,
        "shown_name": "ASCII to Italic Unicode",
        "description": "Convert ASCII characters to Italic Unicode equivalents",
    },
    {
        "name": "ascii-to-bold-italic-unicode",
        "mapper": AsciiToBoldItalicUnicodeMapper,
        "shown_name": "ASCII to Bold Italic Unicode",
        "description": "Convert ASCII characters to Bold Italic Unicode equivalents",
    },
    {
        "name": "ascii-to-script-unicode",
        "mapper": AsciiToScriptUnicodeMapper,
        "shown_name": "ASCII to Script Unicode",
        "description": "Convert ASCII characters to Script Unicode equivalents",
    },
    {
        "name": "ascii-to-bold-script-unicode",
        "mapper": AsciiToBoldScriptUnicodeMapper,
        "shown_name": "ASCII to Bold Script Unicode",
        "description": "Convert ASCII characters to Bold Script Unicode equivalents",
    },
]