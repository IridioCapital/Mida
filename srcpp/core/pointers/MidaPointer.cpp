#include "Pointer.h";

using namespace Mida;

template <class T>
MidaPointer::MidaPointer (T* pointer) {
    this -> pointer = pointer;
}

MidaPointer::~MidaPointer () {
    delete this -> pointer;
}

T& MidaPointer::operator * () {
    return this -> *pointer;
}
