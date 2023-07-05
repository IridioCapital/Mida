namespace Mida::Utilities {
    unsigned int getCharArrayLength (const char* array) {
        unsigned int counter = 0;

        while (*array != '\0') {
            ++counter;
            ++array;
        }

        return counter;
    }
}