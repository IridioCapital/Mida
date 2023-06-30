#include "../vectors/MidaVector.h";

namespace Mida {
    namespace {
        unsigned int charArrayLength (char* array) {
            unsigned int i = 0;

            while (*array != '\0') {
                ++i;
                ++array;
            }

            return i;
        }
    }

    class MidaString {
        private:

        char* array;

        public:

        MidaString ();
        MidaString (char* array);

        MidaVector<MidaString>& split (char* pattern);

        unsigned int length () const;
    }
}
