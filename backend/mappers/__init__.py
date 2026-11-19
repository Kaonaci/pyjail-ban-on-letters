from .mapper import Mapper


class AsciiToUnicodeMapper(Mapper):
    @staticmethod
    def is_replacable_with_unicode(char:str) -> bool:
        """
        che    mapping1 = Asck is char has variant in unicode
        """
        return 0x21 <= ord(char) <= 0x7E

    @staticmethod
    def char_ascii_to_unicode(char:str) -> str:
        """
        convert ASCII to UNICODE by adding 0xFEE0.
        example:
        flag -> ｆｌａｇ
        """
        if len(char) != 1:
            raise ValueError
        char_ord = ord(char)
        if AsciiToUnicodeMapper.is_replacable_with_unicode(char):
            return chr(char_ord + 0xFEE0)
        return char

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
            if AsciiToUnicodeMapper.is_replacable_with_unicode(char):
                mapping[char] = AsciiToUnicodeMapper.char_ascii_to_unicode(char)
        return mapping