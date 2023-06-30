namespace Mida {
    class MidaString {
        private:

        MidaVector<char>* vector;

        public:

        MidaString ();

        long int length () const;
    }
}
