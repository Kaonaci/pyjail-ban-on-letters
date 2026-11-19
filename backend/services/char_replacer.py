class CharReplacer:
    @staticmethod
    def replace(text: str, mapping: dict[str, str]) -> str:
        """
        Replace charecters in string using mapping table
        """
        return text.translate(str.maketrans(mapping))
