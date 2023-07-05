#include "MidaString.h"
#include "../utilities/MidaUtilities.h"

using namespace Mida;

MidaString::MidaString () {
	this -> array = new char[1];
	this -> array[0] = '\0';
	this -> length = 0;
}

MidaString::MidaString (const char* array) {
	if (array == nullptr) {
        this -> array = new char[1];
        this -> array[0] = '\0';
        this -> length = 0;
	}
	else {
		unsigned int inputArrayLength = Utilities::getCharArrayLength(array);
		char* extendedArray = new char[inputArrayLength + 1];

		for (unsigned int i = 0; i < inputArrayLength; ++i) {
			extendedArray[i] = array[i];
		}

		extendedArray[inputArrayLength] = '\0';

		this -> array = extendedArray;
		this -> length = inputArrayLength;
	}
}

MidaString::~MidaString() {
    delete[] this -> array;
}

bool MidaString::operator == (const char* operand) const {
	if (this -> length != Utilities::getCharArrayLength(operand)) {
		return false;
	}

	for (unsigned int i = 0; i < length; ++i) {
		if (this -> array[i] != operand[i]) {
			return false;
		}
	}

	return true;
}

bool MidaString::operator == (const MidaString& string) const {
	return *this == string.array;
}

MidaString& MidaString::operator [] (long int index) const {
    long int normalizedIndex = index;

    if (index < 0) {
        normalizedIndex = this -> length + index;
    }

    if (normalizedIndex < 0 || normalizedIndex >= this -> length) {
        throw;
    }

    char* modifiedArray = new char[2] {
        this -> array[normalizedIndex],
        '\0',
    };

    return *(new MidaString(modifiedArray));
}

MidaString& MidaString::removeAt (long int index) const {
    long int normalizedIndex = index;

    if (index < 0) {
        normalizedIndex = this -> length + index;
    }

    if (normalizedIndex < 0 || normalizedIndex >= this -> length) {
        throw;
    }

    char* modifiedArray = new char[this -> length - 1];
    long int modifiedArrayIndex = 0;

    for (long int i = 0; i < this -> length; ++i) {
        if (i == normalizedIndex) {
            continue;
        }

        else {
            modifiedArray[modifiedArrayIndex++] = this -> array[i];
        }
    }

    return *new MidaString(modifiedArray);
}

long int MidaString::getLength() const {
    return this -> length;
}

const char* MidaString::getArray () const {
    return this -> array;
}

MidaString& MidaString::operator + (const char* operand) const {
    long int operandLength = Utilities::getCharArrayLength(operand);
    char* modifiedArray = new char[this -> length + operandLength];
    long int modifiedArrayIndex = 0;

    for (long int i = 0; i < this -> length; ++i) {
        modifiedArray[modifiedArrayIndex++] = this -> array[i];
    }

    for (long int i = 0; i < operandLength; ++i) {
        modifiedArray[modifiedArrayIndex++] = operand[i];
    }

    return *new MidaString(modifiedArray);
}

MidaString& MidaString::operator + (const MidaString& operand) const {
    return *this + operand.array;
}

MidaString& MidaString::operator += (const char* operand) {
    return *this = *this + operand;
}

MidaString& MidaString::operator += (const MidaString& operand) {
    return *this = *this + operand.array;
}

long int MidaString::find (const char* pattern) const {
    long int patternLength = Utilities::getCharArrayLength(pattern);

    if (this -> length < patternLength) {
        return -1;
    }

    if (this -> length == patternLength && this -> array[0] != pattern[0]) {
        return -1;
    }

    for (long int i = 0; i < this -> length; ++i) {
        long int pivotIndex = i;

        if (this -> array[pivotIndex] != pattern[0]) {
            continue;
        }

        for (long int j = 1; j < patternLength; ++j) {
            if (this -> array[++i] != pattern[j]) {
                pivotIndex = -1;

                break;
            }
        }

        if (pivotIndex != -1) {
            return pivotIndex;
        }
    }

    return -1;
}

long int MidaString::find (const MidaString& pattern) const {
    return this -> find(pattern.array);
}

MidaString& string (const char* array) {
    return *new MidaString(array);
}

MidaString& string (const MidaString& string) {
    return *new MidaString(string.getArray());
}