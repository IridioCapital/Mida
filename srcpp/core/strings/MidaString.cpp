#include "MidaString.h"

using namespace Mida;

MidaString::MidaString () {
	this -> array = new char[1];
	this -> array[0] = '\0';
	this -> length = 0;
}

MidaString::MidaString (const char* array) {
	if (array == nullptr) {
		*this = MidaString();
	}
	else {
		unsigned int length = charArrayLength(array);
		char* extendedArray = new char[length + 1];

		for (unsigned int i = 0; i < length; ++i) {
			extendedArray[i] = array[i];
		}

		extendedArray[length] = '\0';

		this -> array = extendedArray;
		this -> length = length;
	}
}

bool MidaString::operator == (const char* operand) const {
	unsigned int length = this -> length;

	if (length != charArrayLength(operand)) {
		return false;
	}

	char* array = this -> array;

	for (unsigned int i = 0; i < length; ++i) {
		if (array[i] != operand[i]) {
			return false;
		}
	}

	return true;
}

bool MidaString::operator == (const MidaString& string) const {
	return this == string -> array;
}

MidaString& MidaString::operator [] (unsigned int i) const {
    unsigned int length = this -> length;
    unsigned int normalizedIndex = index;

    if (index < 0) {
        normalizedIndex = length - index;
    }

    if (normalizedIndex < 0 || normalizedIndex >= length) {
        throw;
    }

    return new MidaString({ *(this -> array + index), });
}

MidaString& MidaString::removeAt (unsigned int i) const {
    long int length = this -> length;
    long int normalizedIndex = index;

    if (index < 0) {
        normalizedIndex = length - index;
    }

    if (normalizedIndex < 0 || normalizedIndex >= length) {
        throw;
    }

    return new MidaString();
}