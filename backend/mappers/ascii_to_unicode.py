from ..interfaces.mapper import Mapper


class AsciiToUnicodeMapper(Mapper):
    @staticmethod
    def char_ascii_to_unicode(char:str) -> str | None:
        """
        Convert ASCII to UNICODE by adding 0xFEE0.
        example:
        flag -> ｆｌａｇ
        """
        if len(char) != 1:
            raise ValueError
        char_ord = ord(char)
        if 0x21 <= char_ord <= 0x7E:
            return chr(char_ord + 0xFF01 - 0x21)
        return None

    @staticmethod
    def get_default_alphabet() -> str:
        alphabet = [chr(val) for val in range(0x21, 0x7E + 1)]
        return "".join(alphabet)

    @staticmethod
    def get_mapping(alphabet:str | None = None) -> dict[str, str]:
        if alphabet is None:
            alphabet = AsciiToUnicodeMapper.get_default_alphabet()

        mapping = {}
        for char in set(alphabet):
            replace_char = AsciiToUnicodeMapper.char_ascii_to_unicode(char)
            if replace_char is not None:
                mapping[char] = replace_char
        return mapping