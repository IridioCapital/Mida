#include "../../core/vectors/MidaVector.h"
#include "WilliamsPercentRange.h"

using Mida::MidaVector;
using Mida::Indicators::WilliamsPercentRange;

long double getMin (const MidaVector<long double>& values, long int fromIndex, long int toIndex) {
    long double min = values[fromIndex];

    for (long int i = fromIndex + 1; i < toIndex; ++i) {
        if (values[i] < min) {
            min = values[i];
        }
    }

    return min;
}

long double getMax (const MidaVector<long double>& values, long int fromIndex, long int toIndex) {
    long double max = values[fromIndex];

    for (long int i = fromIndex + 1; i < toIndex; ++i) {
        if (values[i] > max) {
            max = values[i];
        }
    }

    return max;
}

WilliamsPercentRange::WilliamsPercentRange () : MidaIndicator("WilliamsPercentRange") {
    this -> length = 14;
    this -> pivotIndex = 0;
}

WilliamsPercentRange::WilliamsPercentRange (const long int length) : MidaIndicator("WilliamsPercentRange") {
    this -> length = length;
    this -> pivotIndex = 0;
}

long int WilliamsPercentRange::getLength () const {
    return this -> length;
}

void WilliamsPercentRange::compute () {
    const MidaVector<const MidaVector<long double>*>& currentInput = this -> getInput();
    const MidaVector<long double>& highs = *currentInput[0];
    const MidaVector<long double>& lows = *currentInput[1];
    const MidaVector<long double>& closings = *currentInput[2];
    MidaVector<long double>& currentOutput = this -> getOutput();
    const long int currentInputLength = closings.getLength();
    const long int periodsLength = this -> length;
    long int currentPivotIndex = this -> pivotIndex;

    while (currentPivotIndex + periodsLength <= currentInputLength) {
        const long double high = getMax(highs, currentPivotIndex, currentPivotIndex + periodsLength);
        const long double low = getMin(lows, currentPivotIndex, currentPivotIndex + periodsLength);

        currentOutput.push((high - closings[currentPivotIndex]) / (high - low));

        ++currentPivotIndex;
    }

    this -> pivotIndex = currentPivotIndex;
}