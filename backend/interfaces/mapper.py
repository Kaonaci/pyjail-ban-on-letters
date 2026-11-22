from abc import ABC, abstractmethod


class Mapper(ABC):
    @staticmethod
    @abstractmethod
    def get_default_alphabet() -> str:
        """
        Get chars which mapping can replace
        """

    @staticmethod
    @abstractmethod
    def get_mapping(alphabet:str | None = None) -> dict[str, str]:
        """
        Get mapping dict
        """