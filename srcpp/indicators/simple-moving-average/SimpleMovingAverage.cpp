#include "SimpleMovingAverage.h"

SimpleMovingAverage::SimpleMovingAverage () {
    *this = SimpleMovingAverage(14);
}

SimpleMovingAverage::SimpleMovingAverage (const int length) {
    this -> length = length;
}

template <class T = long double>
MidaVector<T>& SimpleMovingAverage::feed<T> (MidaVector<T>& values) {

}

int SimpleMovingAverage::getLength () const {
    return this -> length;
}
