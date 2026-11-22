from string import ascii_letters

from ..interfaces.mapper import Mapper


class AsciiToItalicUnicodeMapper(Mapper):
    @staticmethod
    def char_ascii_to_italic_unicode(char:str) -> str:
        """
        Convert ASCII letters to italic UNICODE.
        example:
        flag -> 𝑓𝑙𝑎𝑔
        """
        if len(char) != 1:
            raise ValueError
        char_ord = ord(char)
        if char == "h":
            # Italic h doesn't exist as 0x1d455
            return chr(0x210E)
        if 0x41 <= char_ord <= 0x5a:
            return chr(char_ord + 0x1D434 - 0x41)
        elif 0x61 <= char_ord <= 0x7a:
            return chr(char_ord + 0x1D44E - 0x61)
        return char

    @staticmethod
    def get_default_alphabet() -> str:
        return ascii_letters

    @staticmethod
    def get_mapping(alphabet:str | None = None) -> dict[str, str]:
        if alphabet is None:
            alphabet = AsciiToItalicUnicodeMapper.get_default_alphabet()

        mapping = {}
        for char in set(alphabet):
            replace_char = AsciiToItalicUnicodeMapper.char_ascii_to_italic_unicode(char)
            if replace_char is not None:
                mapping[char] = replace_char
        return mapping