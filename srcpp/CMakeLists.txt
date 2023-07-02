cmake_minimum_required(VERSION 3.25)
project(Mida)

set(CMAKE_CXX_STANDARD 17)

include_directories(core/bars)
include_directories(core/decimals)
include_directories(core/events)
include_directories(core/indicators)
include_directories(core/orders)
include_directories(core/pointers)
include_directories(core/strings)
include_directories(core/vectors)
include_directories(indicators/simple-moving-average)

add_executable(srcpp
        core/strings/MidaString.cpp
        core/strings/MidaString.h
        main.cpp core/vectors/MidaVector.cpp)
