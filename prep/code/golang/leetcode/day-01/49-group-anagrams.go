package main

import (
	"strconv"
	"strings"
)

/*

1. create a consistent hash for each word
2. add to the list - keyed by the hash
3. return the list
*/

func buildHash(s1 string) string {
	counts := make([]int, 26)

	for _, r := range s1 {
		if r >= 'a' && r <= 'z' {
			counts[int(r-'a')]++
		}
	}

	parts := make([]string, len(counts))

	for i, v := range counts {
		parts[i] = strconv.Itoa(v)
	}

	return strings.Join(parts, "#")
}

func GroupAnagram(strs []string) [][]string {
	hashMap := make(map[string][]string)

	for _, s := range strs {
		hash := buildHash(s)
		hashMap[hash] = append(hashMap[hash], s)
	}

	groups := make([][]string, 0, len(hashMap))

	for _, v := range hashMap {
		groups = append(groups, v)
	}

	return groups
}
