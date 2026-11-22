from string import ascii_letters

from ..interfaces.mapper import Mapper


class AsciiToBoldScriptUnicodeMapper(Mapper):
    @staticmethod
    def char_ascii_to_bold_script_unicode(char:str) -> str:
        """
        Convert ASCII letters to bold script UNICODE.
        example:
        flag -> 𝓯𝓵𝓪𝓰
        """
        if len(char) != 1:
            raise ValueError
        char_ord = ord(char)
        if 0x41 <= char_ord <= 0x5a:
            return chr(char_ord + 0x1D4D0 - 0x41)
        elif 0x61 <= char_ord <= 0x7a:
            return chr(char_ord + 0x1D4EA - 0x61)
        return char

    @staticmethod
    def get_default_alphabet() -> str:
        return ascii_letters

    @staticmethod
    def get_mapping(alphabet:str | None = None) -> dict[str, str]:
        if alphabet is None:
            alphabet = AsciiToBoldScriptUnicodeMapper.get_default_alphabet()

        mapping = {}
        for char in set(alphabet):
            replace_char = AsciiToBoldScriptUnicodeMapper.char_ascii_to_bold_script_unicode(char)
            if replace_char is not None:
                mapping[char] = replace_char
        return mapping