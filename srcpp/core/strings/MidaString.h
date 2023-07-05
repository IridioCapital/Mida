namespace Mida {
    class MidaString {
        private:

        char* array;
        long int length;

        public:

        explicit MidaString ();
        explicit MidaString (const char* array);
        ~MidaString ();

        long int find (const char* pattern) const;
        long int find (const MidaString& pattern) const;

        /*
        MidaVector<MidaString>& split (const char* pattern) const;
        MidaVector<MidaString>& split (const char* pattern, int limit) const;*/

        MidaString& removeAt (long int i) const;

        bool operator == (const char* array) const;
        bool operator == (const MidaString& string) const;

        MidaString& operator + (const char* operand) const;
        MidaString& operator + (const MidaString& operand) const;

        MidaString& operator += (const char* operand);
        MidaString& operator += (const MidaString& operand);
        MidaString& operator [] (long int i) const;

        long int getLength () const;

        const char* getArray () const;
    };

    MidaString& string (const char* array);
    MidaString& string (const MidaString& string);
}
