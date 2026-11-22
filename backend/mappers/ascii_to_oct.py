from ..interfaces.mapper import Mapper


class AsciiToOctMapper(Mapper):
    @staticmethod
    def char_ascii_to_oct(char:str) -> str:
        """
        Convert ASCII to OCT.
        example:
        flag -> \146\154\141\147
        """
        if len(char) != 1:
            raise ValueError
        char_ord = ord(char)
        if 0x00 <= char_ord <= 0xFF:
            return f'\\{char_ord:03o}'
        return char 

    @staticmethod
    def get_default_alphabet() -> str:
        alphabet = [chr(val) for val in range(0xFF + 1)]
        return "".join(alphabet)

    @staticmethod
    def get_mapping(alphabet:str | None = None) -> dict[str, str]:
        if alphabet is None:
            alphabet = AsciiToOctMapper.get_default_alphabet()

        mapping = {}
        for char in set(alphabet):
            replace_char = AsciiToOctMapper.char_ascii_to_oct(char)
            if replace_char is not None:
                mapping[char] = replace_char
        return mapping