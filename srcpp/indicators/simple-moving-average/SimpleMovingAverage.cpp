#include "SimpleMovingAverage.h"

using Mida::SimpleMovingAverage;

SimpleMovingAverage::SimpleMovingAverage () {
    this -> length = 14;
    this -> pivotIndex = 0;
}

SimpleMovingAverage::SimpleMovingAverage (const long int length) {
    this -> length = length;
    this -> pivotIndex = 0;
}

long int SimpleMovingAverage::getLength () const {
    return this -> length;
}

void SimpleMovingAverage::compute () {
    const MidaVector<long double>& currentInput = this -> getInput();
    const long int currentInputLength = currentInput.getLength();

    const long int periodsLength = this -> length;
    long int currentPivotIndex = this -> pivotIndex;

    while (currentPivotIndex + periodsLength <= currentInputLength) {
        long int i = currentPivotIndex;
        long double pivotAccumulator = 0;

        for (; i < currentPivotIndex + periodsLength; ++i) {
            pivotAccumulator += currentInput[i];
        }

        ++currentPivotIndex;
        this -> getOutput().push(pivotAccumulator / (long double) periodsLength);
    }

    this -> pivotIndex = currentPivotIndex;
}