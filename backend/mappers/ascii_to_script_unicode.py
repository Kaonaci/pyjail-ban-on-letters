from string import ascii_letters

from ..interfaces.mapper import Mapper


class AsciiToScriptUnicodeMapper(Mapper):
    @staticmethod
    def char_ascii_to_script_unicode(char:str) -> str:
        """
        Convert ASCII letters to script UNICODE.
        example:
        flag -> 𝒻𝓁𝒶ℊ
        """
        if len(char) != 1:
            raise ValueError
        char_ord = ord(char)
        # Exception for converting to script
        match char:
            case "B":
                return chr(0x212C)
            case "E":
                return chr(0x2130)
            case "F":
                return chr(0x2131)
            case "H":
                return chr(0x210B)
            case "I":
                return chr(0x2110)
            case "L":
                return chr(0x2112)
            case "M":
                return chr(0x2133)
            case "R":
                return chr(0x211B)
            case "e":
                return chr(0x212F)
            case "g":
                return chr(0x210A)
            case "o":
                return chr(0x2134)

        if 0x41 <= char_ord <= 0x5a:
            return chr(char_ord + 0x1D49C - 0x41)
        elif 0x61 <= char_ord <= 0x7a:
            return chr(char_ord + 0x1D4B6 - 0x61)
        return char

    @staticmethod
    def get_default_alphabet() -> str:
        return ascii_letters

    @staticmethod
    def get_mapping(alphabet:str | None = None) -> dict[str, str]:
        if alphabet is None:
            alphabet = AsciiToScriptUnicodeMapper.get_default_alphabet()

        mapping = {}
        for char in set(alphabet):
            replace_char = AsciiToScriptUnicodeMapper.char_ascii_to_script_unicode(char)
            if replace_char is not None:
                mapping[char] = replace_char
        return mapping