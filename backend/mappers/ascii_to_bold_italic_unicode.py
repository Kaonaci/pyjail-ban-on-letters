from string import ascii_letters

from .mapper import Mapper


class AsciiToBoldItalicUnicodeMapper(Mapper):
    @staticmethod
    def char_ascii_to_bold_italic_unicode(char:str) -> str:
        """
        Convert ASCII letters to bold UNICODE.
        example:
        flag -> 𝒇𝒍𝒂𝒈
        """
        if len(char) != 1:
            raise ValueError
        char_ord = ord(char)
        if 0x41 <= ord(char) <= 0x5a:
            return chr(char_ord + 0x1D468 - 0x41)
        elif 0x61 <= ord(char) <= 0x7a:
            return chr(char_ord + 0x1D482 - 0x61)
        return char

    @staticmethod
    def get_default_alphabet() -> str:
        return ascii_letters

    @staticmethod
    def get_mapping(alphabet:str | None = None) -> dict[str, str]:
        if alphabet is None:
            alphabet = AsciiToBoldItalicUnicodeMapper.get_default_alphabet()

        mapping = {}
        for char in set(alphabet):
            replace_char = AsciiToBoldItalicUnicodeMapper.char_ascii_to_bold_italic_unicode(char)
            if replace_char is not None:
                mapping[char] = replace_char
        return mapping