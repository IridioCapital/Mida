#pragma once

#include <iostream>
using namespace std;

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

        MidaVector ();
        ~MidaVector ();

        long int push (T element);

        T* pop ();
        T* shift ();
        T* removeAt (long int index);

        long int getLength () const;
        T& operator [] (long int index) const;
    };

    template <class T>
    MidaVector<T>::MidaVector () {
        this -> array = new T[MIN_CAPACITY];
        this -> length = 0;
        this -> capacity = MIN_CAPACITY;
    }

    template <class T>
    MidaVector<T>::~MidaVector () {
        delete[] this -> array;
    }

    template <class T>
    long int MidaVector<T>::push (T element) {
        const long int currentLength = this -> length;
        const long int currentCapacity = this -> capacity;

        if (currentLength == currentCapacity) {
            const long int extendedCapacity = currentCapacity * GROWTH_FACTOR;
            T* previousArray = this -> array;
            T* extendedArray = new T[extendedCapacity];

            for (long int i = 0; i < currentLength; ++i) {
                extendedArray[i] = previousArray[i];
            }

            this -> array = extendedArray;
            delete[] previousArray;
        }

        this -> array[currentLength] = element;

        return ++this -> length;
    }

    template <class T>
    T* MidaVector<T>::pop () {
        return this -> array[--length];
    }

    template <class T>
    T* MidaVector<T>::shift () {
        const long int currentLength = this -> length;
        T* currentArray = this -> array;
        T& element = currentArray[0];

        for (long int i = 1; i < currentLength; ++i) {
            currentArray[i - 1] = currentArray[i];
        }

        --this -> length;

        return element;
    }

    template <class T>
    T* MidaVector<T>::removeAt (long int index) {
        const long int currentLength = this -> length;
        long int normalizedIndex = index;

        if (index < 0) {
            normalizedIndex = currentLength - index;
        }

        if (normalizedIndex < 0 || normalizedIndex >= currentLength) {
            throw;
        }

        T* currentArray = this -> array;
        T* element = currentArray[normalizedIndex];
/*
        for (long int i = normalizedIndex + 1; i < currentLength; ++i) {
            currentArray[i - 1] = currentArray[i];
        }

        --this -> length;*/

        return element;
    }

    template <class T>
    long int MidaVector<T>::getLength () const {
        return this -> length;
    }

    template <class T>
    T& MidaVector<T>::operator [] (long int index) const {
        long int currentLength = this -> length;
        long int normalizedIndex = index;

        if (index < 0) {
            normalizedIndex = currentLength + index;
        }

        if (normalizedIndex < 0 || normalizedIndex >= currentLength) {
            throw;
        }

        return this -> array[normalizedIndex];
    }
}

