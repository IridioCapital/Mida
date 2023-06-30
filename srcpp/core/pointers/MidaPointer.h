namespace Mida {
    template <class T>
    class MidaPointer {
        private:
        T* pointer;

        public:
        explicit MidaPointer (T* pointer);
        ~MidaPointer ();

        T& operator * ();
        T* operator -> ();
    }
}
