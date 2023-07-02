#include "MidaVector.h"

using namespace Mida;

template <class T>
MidaVector<T>::~MidaVector () {
    delete[] this -> array;
    delete this;
}

template <class T>
long int MidaVector<T>::push (T element) {
    long int length = this -> length;
    long int capacity = this -> capacity;

    if (length == capacity) {
        long int extendedCapacity = capacity * GROWTH_FACTOR;
        T* previousArray = this -> array;
        T* extendedArray = new T[extendedCapacity];

        for (long int i = 0; i < length; ++i) {
            extendedArray[i] = previousArray[i];
        }

        this -> array = extendedArray;
        delete[] previousArray;
    }

    this -> array[length] = element;
    this -> length = ++length;

    return length;
}

template <class T>
T& MidaVector<T>::pop () {
    return this -> array[--length];
}

template <class T>
T& MidaVector<T>::shift () {
    long int length = this -> length;
    T& element = this[0];

    for (long int i = 1; i < length; ++i) {
        this -> array[i - 1] = this -> array[i];
    }

    this -> length = --length;

    return element;
}

template <class T>
T& MidaVector::removeAt (long int index) {
    long int length = this -> length;
    long int normalizedIndex = index;

    if (index < 0) {
        normalizedIndex = length - index;
    }

    if (normalizedIndex < 0 || normalizedIndex >= length) {
        throw;
    }

    T& element = this[normalizedIndex];

    for (long int i = normalizedIndex + 1; i < length; ++i) {
        this -> array[i - 1] = this -> array[i];
    }

    this -> length = --length;

    return element;
}

long int MidaVector::length () const {
    return this -> length;
}

template <class T>
T& MidaVector<T>::operator [] (long int index) const {
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
