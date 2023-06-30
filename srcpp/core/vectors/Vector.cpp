#include "Vector.h";

using namespace Mida;

template <class T>
long int Vector<T>::push (T element) {
    long int length = this -> length;
    long int capacity = this -> capacity;

    if (length == capacity) {
        long int extendedCapacity = capacity * 2;
        T* previousArray = this -> array;
        T* extendedArray = new T[extendedCapacity];

        for (long int i = 0; i < length; ++i) {
            extendedArray[i] = previousArray[i];
        }

        this -> array = extendedArray;
        delete[] previousArray;
    }

    this -> array[length++] = element;

    return length;
}

template <class T>
T& Vector<T>::operator [] (long int index) {
    long int length = this -> length;
    long int normalizedIndex = index;

    if (index < 0) {
        normalizedIndex = length - index;
    }

    if (normalizedIndex < 0 || normalizedIndex >= length) {
        throw;
    }

    return *(this -> array + index);
}
