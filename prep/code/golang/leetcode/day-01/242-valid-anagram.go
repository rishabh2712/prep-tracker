package main

import "fmt"

// Day 01 - 2026-02-18
// Concept: Arrays+HashMap
// Practice target: implement one key idea from today's TypeScript solutions.

/*
	length -
*/

func buildFrqMap(s1 string) map[rune]int {
	var seen = make(map[rune]int)

	for _, s := range s1 {
		seen[s]++
	}

	return seen
}

func validAnagram(s1, s2 string) bool {
	if len(s1) != len(s2) {
		return false
	}

	freqMap := buildFrqMap(s1)

	for _, s := range s1 {
		if freqMap[s] == 0 {
			return false
		}

		freqMap[s]--
	}

	return true
}

func main() {
	// fmt.Println(validAnagram("anagram", "nagaram")) // true
	// fmt.Println(validAnagram("rat", "car"))         // false

	fmt.Println("demo grp anagram")
	fmt.Println(GroupAnagram([]string{"eat", "tea", "tan", "ate", "nat", "bat"}))
}
