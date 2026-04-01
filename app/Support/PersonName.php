<?php

namespace App\Support;

class PersonName
{
    public static function clean(?string $value): string
    {
        return trim(preg_replace('/\s+/', ' ', (string) $value));
    }

    /**
     * @return array{0:string,1:?string}
     */
    public static function split(?string $fullName): array
    {
        $normalized = static::clean($fullName);

        if ($normalized === '') {
            return ['', null];
        }

        $parts = preg_split('/\s+/', $normalized) ?: [];
        $firstName = array_shift($parts) ?? '';
        $lastName = static::clean(implode(' ', $parts));

        return [$firstName, $lastName !== '' ? $lastName : null];
    }

    public static function combine(?string $firstName, ?string $lastName): string
    {
        return static::clean(implode(' ', array_filter([
            static::clean($firstName),
            static::clean($lastName),
        ])));
    }

    /**
     * @return array{name:string,first_name:?string,last_name:?string}
     */
    public static function normalize(?string $firstName, ?string $lastName, ?string $fallbackName = null): array
    {
        $normalizedFirstName = static::clean($firstName);
        $normalizedLastName = static::clean($lastName);

        if ($normalizedFirstName === '' && $fallbackName !== null) {
            [$normalizedFirstName, $fallbackLastName] = static::split($fallbackName);
            $normalizedLastName = $normalizedLastName !== ''
                ? $normalizedLastName
                : static::clean($fallbackLastName);
        }

        $fullName = static::combine($normalizedFirstName, $normalizedLastName);

        return [
            'name' => $fullName,
            'first_name' => $normalizedFirstName !== '' ? $normalizedFirstName : null,
            'last_name' => $normalizedLastName !== '' ? $normalizedLastName : null,
        ];
    }
}
