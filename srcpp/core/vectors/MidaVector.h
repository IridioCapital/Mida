namespace Mida {
    static const int MIN_CAPACITY = 16;
    static const int GROWTH_FACTOR = 2;
    static const int SHRINK_FACTOR = 4;

    template <class T>
    class MidaVector {
        private:

        T* array;
        long int capacity;
        long int length;

        public:

        explicit MidaVector ();
        ~MidaVector ();

        long int push (T& element);
        T& pop ();
        T& shift ();
        T& removeAt (long int index);
        long int length () const;
        &T operator [] (long int index) const;
    }
}
