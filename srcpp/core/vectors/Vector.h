namespace Mida {
    static const int MIN_CAPACITY = 16;
    static const int GROWTH_FACTOR = 2;
    static const int SHRINK_FACTOR = 4;

    template <class T>
    class Vector {
        private:

        T* array;
        long int capacity;
        long int length;

        public:

        explicit Vector ();

        long int push (T element);
        T pop ();
        long int length () const;
        &T operator [] (long int index) const;
    }
}
