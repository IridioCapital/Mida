#include "../vectors/MidaVector.h";

namespace Mida {
    namespace {
        unsigned int charArrayLength (char* array) {
            unsigned int counter = 0;

            while (*array != '\0') {
                ++counter;
                ++array;
            }

            return counter;
        }
    }

    class MidaString {
        private:

        const char* array;
        const unsigned int length;

        public:

        MidaString ();
        MidaString (const char* array);
        ~MidaString ();

        MidaVector<MidaString>& split (const char* pattern) const;
        MidaVector<MidaString>& split (const char* pattern, int limit) const;

        MidaString& removeAt (unsigned int i) const;

        bool operator == (const char* array) const;
        bool operator == (const MidaString& string) const;
        MidaString& operator += (const char* array) const;
        MidaString& operator += (MidaString& string) const;
        MidaString& operator [] (unsigned int i) const;

        unsigned int length () const;
    }
}
