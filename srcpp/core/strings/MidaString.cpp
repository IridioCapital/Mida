#include <iostream>
#include "MidaString.h"

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
		unsigned int inputArrayLength = charArrayLength(array);
		char* extendedArray = new char[inputArrayLength + 1];

		for (unsigned int i = 0; i < inputArrayLength; ++i) {
			extendedArray[i] = array[i];
		}

		extendedArray[inputArrayLength] = '\0';

		this -> array = extendedArray;
		this -> length = inputArrayLength;
	}
}

bool MidaString::operator == (const char* operand) const {
	if (this -> length != charArrayLength(operand)) {
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

    std::cout << "test";

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

    std::cout << modifiedArray;

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

    return *(new MidaString(modifiedArray));
}

long int MidaString::getLength() const {
    return this -> length;
}

const char* MidaString::get () const {
    return this -> array;
}