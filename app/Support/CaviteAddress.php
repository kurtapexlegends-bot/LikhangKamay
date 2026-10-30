<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

class CaviteAddress
{
    public const PROVINCE = 'Cavite';

    /**
     * Official 23 Cities and Municipalities in Cavite
     */
    public const CITIES = [
        'Alfonso',
        'Amadeo',
        'Bacoor City',
        'Carmona',
        'Cavite City',
        'Dasmariñas City',
        'General Emilio Aguinaldo',
        'General Mariano Alvarez',
        'General Trias City',
        'Imus City',
        'Indang',
        'Kawit',
        'Magallanes',
        'Maragondon',
        'Mendez',
        'Naic',
        'Noveleta',
        'Rosario',
        'Silang',
        'Tagaytay City',
        'Tanza',
        'Ternate',
        'Trece Martires City',
    ];

    /**
     * Official approximate city/municipality centroid coordinates in Cavite
     *
     * @var array<string, array{lat: float, lng: float}>
     */
    public const CITY_COORDINATES = [
        'bacoor' => ['lat' => 14.4624, 'lng' => 120.9645],
        'cavite city' => ['lat' => 14.4831, 'lng' => 120.8986],
        'dasmarinas' => ['lat' => 14.3294, 'lng' => 120.9367],
        'general trias' => ['lat' => 14.3867, 'lng' => 120.8812],
        'imus' => ['lat' => 14.4296, 'lng' => 120.9367],
        'tagaytay' => ['lat' => 14.1153, 'lng' => 120.9621],
        'trece martires' => ['lat' => 14.2827, 'lng' => 120.8669],
        'alfonso' => ['lat' => 14.1378, 'lng' => 120.8539],
        'amadeo' => ['lat' => 14.1706, 'lng' => 120.9231],
        'carmona' => ['lat' => 14.3142, 'lng' => 121.0583],
        'general emilio aguinaldo' => ['lat' => 14.1833, 'lng' => 120.7981],
        'general mariano alvarez' => ['lat' => 14.3000, 'lng' => 121.0044],
        'indang' => ['lat' => 14.1953, 'lng' => 120.8767],
        'kawit' => ['lat' => 14.4444, 'lng' => 120.9028],
        'magallanes' => ['lat' => 14.1917, 'lng' => 120.7556],
        'maragondon' => ['lat' => 14.2750, 'lng' => 120.7381],
        'mendez' => ['lat' => 14.1294, 'lng' => 120.9042],
        'naic' => ['lat' => 14.3197, 'lng' => 120.7678],
        'noveleta' => ['lat' => 14.4283, 'lng' => 120.8803],
        'rosario' => ['lat' => 14.4144, 'lng' => 120.8575],
        'silang' => ['lat' => 14.2319, 'lng' => 120.9742],
        'tanza' => ['lat' => 14.3942, 'lng' => 120.8542],
        'ternate' => ['lat' => 14.2881, 'lng' => 120.7167],
    ];

    /**
     * Resolve approximate coordinates for a Cavite city or municipality
     *
     * @return array{lat: float, lng: float}|null
     */
    public static function getCityCoordinates(?string $city): ?array
    {
        if ($city === null || trim($city) === '') {
            return null;
        }

        $normalized = self::normalize($city);
        return self::CITY_COORDINATES[$normalized] ?? null;
    }

    /**
     * Resolve approximate coordinates for a Cavite city or municipality (alias for getCityCoordinates)
     *
     * @return array{lat: float, lng: float}|null
     */
    public static function getMunicipalityCentroid(?string $city): ?array
    {
        return self::getCityCoordinates($city);
    }

    /**
     * Check if a given region string is strictly Cavite
     */
    public static function isCaviteRegion(?string $region): bool
    {
        if ($region === null) {
            return false;
        }

        $cleaned = self::normalize($region);

        return in_array($cleaned, ['cavite', 'province of cavite', 'cavite province'], true);
    }

    /**
     * Cavite Geographic Bounding Box
     */
    public const BOUNDS = [
        'min_lat' => 14.05,
        'max_lat' => 14.53,
        'min_lng' => 120.55,
        'max_lng' => 121.15,
    ];

    /**
     * Postal codes for official Cavite cities and municipalities
     */
    public const POSTAL_CODES = [
        'Alfonso' => '4123',
        'Amadeo' => '4119',
        'Bacoor City' => '4102',
        'Carmona' => '4116',
        'Cavite City' => '4100',
        'Dasmariñas City' => '4114',
        'General Emilio Aguinaldo' => '4124',
        'General Mariano Alvarez' => '4117',
        'General Trias City' => '4107',
        'Imus City' => '4103',
        'Indang' => '4122',
        'Kawit' => '4104',
        'Magallanes' => '4113',
        'Maragondon' => '4112',
        'Mendez' => '4121',
        'Naic' => '4110',
        'Noveleta' => '4105',
        'Rosario' => '4106',
        'Silang' => '4118',
        'Tagaytay City' => '4120',
        'Tanza' => '4108',
        'Ternate' => '4111',
        'Trece Martires City' => '4109',
    ];

    /**
     * Official Barangays by City/Municipality
     *
     * @var array<string, array<int, string>>
     */
    public const BARANGAYS = [
        'Bacoor City' => ['Alima', 'Aniban I', 'Aniban II', 'Aniban III', 'Aniban IV', 'Aniban V', 'Banalo', 'Bayanan', 'Camposanto', 'Daang Bukid', 'Digman', 'Dulong Bayan', 'Habay I', 'Habay II', 'Kaingin', 'Ligas I', 'Ligas II', 'Ligas III', 'Mabolo I', 'Mabolo II', 'Mabolo III', 'Maliksi I', 'Maliksi II', 'Maliksi III', 'Mambog I', 'Mambog II', 'Mambog III', 'Mambog IV', 'Mambog V', 'Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Molino V', 'Molino VI', 'Molino VII', 'Niog I', 'Niog II', 'Niog III', 'P.F. Espiritu I', 'P.F. Espiritu II', 'P.F. Espiritu III', 'P.F. Espiritu IV', 'P.F. Espiritu V', 'P.F. Espiritu VI', 'P.F. Espiritu VII', 'P.F. Espiritu VIII', 'Panapaan I', 'Panapaan II', 'Panapaan III', 'Panapaan IV', 'Panapaan V', 'Panapaan VI', 'Panapaan VII', 'Panapaan VIII', 'Queens Row Central', 'Queens Row East', 'Queens Row West', 'Real I', 'Real II', 'Salinas I', 'Salinas II', 'Salinas III', 'Salinas IV', 'San Nicolas I', 'San Nicolas II', 'San Nicolas III', 'Sineguelasan', 'Tabing Dagat', 'Talaba I', 'Talaba II', 'Talaba III', 'Talaba IV', 'Talaba V', 'Talaba VI', 'Talaba VII', 'Zapote I', 'Zapote II', 'Zapote III', 'Zapote IV', 'Zapote V'],
        'Cavite City' => ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5', 'Barangay 6', 'Barangay 7', 'Barangay 8', 'Barangay 9', 'Barangay 10', 'Barangay 10-A', 'Barangay 10-B', 'Barangay 11', 'Barangay 12', 'Barangay 13', 'Barangay 14', 'Barangay 15', 'Barangay 16', 'Barangay 17', 'Barangay 18', 'Barangay 19', 'Barangay 20', 'Barangay 21', 'Barangay 22', 'Barangay 22-A', 'Barangay 23', 'Barangay 24', 'Barangay 25', 'Barangay 26', 'Barangay 27', 'Barangay 28', 'Barangay 29', 'Barangay 29-A', 'Barangay 30', 'Barangay 31', 'Barangay 32', 'Barangay 33', 'Barangay 34', 'Barangay 35', 'Barangay 36', 'Barangay 36-A', 'Barangay 37', 'Barangay 38', 'Barangay 38-A', 'Barangay 39', 'Barangay 40', 'Barangay 41', 'Barangay 42', 'Barangay 42-A', 'Barangay 42-B', 'Barangay 42-C', 'Barangay 43', 'Barangay 44', 'Barangay 45', 'Barangay 46', 'Barangay 47', 'Barangay 48', 'Barangay 49', 'Barangay 50', 'Barangay 51', 'Barangay 52', 'Barangay 53', 'Barangay 54', 'Barangay 55', 'Barangay 56', 'Barangay 57', 'Barangay 58', 'Barangay 59', 'Barangay 60', 'Barangay 61', 'Barangay 62'],
        'Dasmariñas City' => ['Burol I', 'Burol II', 'Burol III', 'Burol Main', 'Datu Esmael', 'Emmanuel Bergado I', 'Emmanuel Bergado II', 'Fatima I', 'Fatima II', 'Fatima III', 'Langkaan I', 'Langkaan II', 'Luzviminda I', 'Luzviminda II', 'Paliparan I', 'Paliparan II', 'Paliparan III', 'Sabang', 'Salawag', 'Salitran I', 'Salitran II', 'Salitran III', 'Salitran IV', 'Salitran V', 'Salitran VI', 'Sampaloc I', 'Sampaloc II', 'Sampaloc III', 'Sampaloc IV', 'Sampaloc V', 'San Agustin I', 'San Agustin II', 'San Agustin III', 'San Andres I', 'San Andres II', 'San Dionisio', 'San Esteban', 'San Francisco', 'San Jose', 'San Juan', 'San Lorenzo Ruiz I', 'San Lorenzo Ruiz II', 'San Luis I', 'San Luis II', 'San Manuel I', 'San Manuel II', 'San Miguel I', 'San Miguel II', 'San Nicolas I', 'San Nicolas II', 'San Roque', 'San Simon', 'Santa Cruz I', 'Santa Cruz II', 'Santa Fe', 'Santa Lucia', 'Santa Maria', 'Santo Cristo', 'Santo Niño I', 'Santo Niño II', 'Victoria Reyes', 'Zone I', 'Zone I-A', 'Zone II', 'Zone III', 'Zone IV'],
        'General Trias City' => ['Alingaro', 'Arnaldo Pob.', 'Bacao I', 'Bacao II', 'Bagumbayan Pob.', 'Biclatan', 'Buenavista I', 'Buenavista II', 'Buenavista III', 'Corregidor Pob.', 'Dulong Bayan Pob.', 'Gov. Ferrer Pob.', 'Javalera', 'Manggahan', 'Navarro', 'Ninety Kawit', 'Panungyanan', 'Pasong Camachile I', 'Pasong Camachile II', 'Pasong Kawayan I', 'Pasong Kawayan II', 'Pinagtipunan', 'Prinza Pob.', 'Sampalucan Pob.', 'San Francisco', 'San Gabriel Pob.', 'San Juan I', 'San Juan II', 'Santa Clara', 'Santiago Pob.', 'Tapia', 'Tejero', 'Vibora Pob.'],
        'Imus City' => ['Alapan I-A', 'Alapan I-B', 'Alapan I-C', 'Alapan II-A', 'Alapan II-B', 'Anabu I-A', 'Anabu I-B', 'Anabu I-C', 'Anabu I-D', 'Anabu I-E', 'Anabu I-F', 'Anabu I-G', 'Anabu II-A', 'Anabu II-B', 'Anabu II-C', 'Anabu II-D', 'Anabu II-E', 'Anabu II-F', 'Bagong Silang', 'Bayan Luma I', 'Bayan Luma II', 'Bayan Luma III', 'Bayan Luma IV', 'Bayan Luma V', 'Bayan Luma VI', 'Bayan Luma VII', 'Bayan Luma VIII', 'Bayan Luma IX', 'Buhay na Tubig', 'Bucandala I', 'Bucandala II', 'Bucandala III', 'Bucandala IV', 'Bucandala V', 'Carsadang Bago I', 'Carsadang Bago II', 'Magdalo', 'Maharlika', 'Malagasang I-A', 'Malagasang I-B', 'Malagasang I-C', 'Malagasang I-D', 'Malagasang I-E', 'Malagasang I-F', 'Malagasang I-G', 'Malagasang II-A', 'Malagasang II-B', 'Malagasang II-C', 'Malagasang II-D', 'Malagasang II-E', 'Malagasang II-F', 'Malagasang II-G', 'Mariano Espeleta I', 'Mariano Espeleta II', 'Mariano Espeleta III', 'Medicion I-A', 'Medicion I-B', 'Medicion I-C', 'Medicion I-D', 'Medicion II-A', 'Medicion II-B', 'Medicion II-C', 'Medicion II-D', 'Medicion II-E', 'Medicion II-F', 'Palico I', 'Palico II', 'Palico III', 'Palico IV', 'Pasong Buaya I', 'Pasong Buaya II', 'Pinagbuklod', 'Poblacion I-A', 'Poblacion I-B', 'Poblacion I-C', 'Poblacion II-A', 'Poblacion II-B', 'Poblacion III-A', 'Poblacion III-B', 'Poblacion IV-A', 'Poblacion IV-B', 'Poblacion IV-C', 'Poblacion IV-D', 'Tanzang Luma I', 'Tanzang Luma II', 'Tanzang Luma III', 'Tanzang Luma IV', 'Tanzang Luma V', 'Tanzang Luma VI', 'Toclong I-A', 'Toclong I-B', 'Toclong I-C', 'Toclong II-A', 'Toclong II-B'],
        'Tagaytay City' => ['Asisan', 'Bagong Tubig', 'Calabuso', 'Dapdap East', 'Dapdap West', 'Francisco', 'Guinhawa North', 'Guinhawa South', 'Iruhin Central', 'Iruhin East', 'Iruhin South', 'Iruhin West', 'Kaybagal Central', 'Kaybagal North', 'Kaybagal South', 'Mag-Asawang Ilat', 'Maharlika East', 'Maharlika West', 'Maitim II Central', 'Maitim II East', 'Maitim II West', 'Mendez Crossing East', 'Mendez Crossing West', 'Neogan', 'Patutong Malaki North', 'Patutong Malaki South', 'Sambong', 'San Jose', 'Silang Junction North', 'Silang Junction South', 'Sungay East', 'Sungay West', 'Tolentino East', 'Tolentino West', 'Zambal'],
        'Trece Martires City' => ['Aguado', 'Cabezas', 'Cabuco', 'Conchu', 'De Ocampo', 'Gregorio', 'Inocencio', 'Lapidario', 'Lallana', 'Luciano', 'Osorio', 'Perez', 'San Agustin'],
        'Alfonso' => ['Amuyong', 'Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Barangay V', 'Bilog', 'Buck Estate', 'Esperanza Ibaba', 'Esperanza Ilaya', 'Kaysuyo', 'Luksuhin Ibaba', 'Luksuhin Ilaya', 'Mangas I', 'Mangas II', 'Marahan I', 'Marahan II', 'Matagbak I', 'Matagbak II', 'Pajo', 'Palumlum', 'Kaytambog', 'Kaytapos', 'Upli', 'Sikat', 'Sinaliw Malaki', 'Sinaliw Maliit', 'Taywanak Ibaba', 'Taywanak Ilaya'],
        'Amadeo' => ['Banaybanay', 'Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Barangay V', 'Barangay VI', 'Barangay VII', 'Barangay VIII', 'Bucal', 'Buho', 'Dagatan', 'Halang', 'Laging Handa', 'Maymangga', 'Minantok East', 'Minantok West', 'Pangil', 'Salaban', 'Talon', 'Tamacan'],
        'Carmona' => ['Bancal', 'Cabilang Baybay', 'Lantic', 'Mabuhay', 'Maduya', 'Milagrosa'],
        'General Emilio Aguinaldo' => ['A. Dalusag', 'Batas Dao', 'Castaños Cerca', 'Castaños Lejos', 'Kabulusan', 'Kaymisas', 'Kaypaaba', 'Lumipa', 'Narvaez', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Tabing Dagat'],
        'General Mariano Alvarez' => ['Aldiano Olaes', 'Barangay 1 Poblacion', 'Barangay 2 Poblacion', 'Barangay 3 Poblacion', 'Barangay 4 Poblacion', 'Barangay 5 Poblacion', 'Benjamin Tirona', 'Bernardo Pulido', 'Epifanio Malia', 'Francisco De Castro', 'Francisco Reyes', 'Gavino Maderan', 'Gregorio Aglipay', 'Inocencio Salud', 'Jacinto Lumbreras', 'Kapitan Kua', 'Koronel Jose P. Elises', 'Macario Dacon', 'Marcelino Memije', 'Nicolasa Virata', 'Pantaleon Granados', 'Ramon Cruz', 'San Gabriel', 'San Jose', 'Severino De Las Alas', 'Tiniente Tiago', 'Virgilio Toledo'],
        'Indang' => ['Agus-os', 'Alulod', 'Banaba Cerca', 'Banaba Lejos', 'Bancod', 'Buna Cerca', 'Buna Lejos I', 'Buna Lejos II', 'Calumpang Cerca', 'Calumpang Lejos I', 'Calumpang Lejos II', 'Carasuchi', 'Daine I', 'Daine II', 'Guyam Malaki', 'Guyam Munti', 'Harasan', 'Kayquit I', 'Kayquit II', 'Kayquit III', 'Kaytapos', 'Limbon', 'Lumampong Balagbag', 'Lumampong Halayhay', 'Mahabang Kahoy Cerca', 'Mahabang Kahoy Lejos', 'Mataas na Lupa', 'Pulo', 'Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Tambo Balagbag', 'Tambo Ilaya', 'Tambo Kulit', 'Tambo Malaki', 'Poblacion'],
        'Kawit' => ['Balsahan-Bisita', 'Batong Dalig', 'Binakayan-Aplaya', 'Binakayan-Kanluran', 'Gahak', 'Kaingen', 'Marulas', 'Panamitan', 'Poblacion', 'Pulvorista', 'Samala-Marquez', 'San Sebastian', 'Santa Isabel', 'Tabon I', 'Tabon II', 'Tabon III', 'Toclong', 'Tramo-Bantayan', 'Wakas I', 'Wakas II'],
        'Magallanes' => ['Baliwag', 'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5', 'Barangay 6', 'Barangay 7', 'Bendita I', 'Bendita II', 'Caluangan', 'Pacheco', 'Ramirez', 'San Agustin'],
        'Maragondon' => ['Bucal I', 'Bucal II', 'Bucal III-A', 'Bucal III-B', 'Bucal IV-A', 'Bucal IV-B', 'Caingin Pob.', 'Garita I-A', 'Garita I-B', 'Layong Mabilog', 'Mabato', 'Pantihan I', 'Pantihan II', 'Pantihan III', 'Pantihan IV', 'Patungan', 'Pinagsanhan I-A', 'Pinagsanhan I-B', 'Poblacion I-A', 'Poblacion I-B', 'Poblacion II-A', 'Poblacion II-B', 'San Miguel I-A', 'San Miguel I-B', 'Talipusngo', 'Tulay Kanluran', 'Tulay Silangan'],
        'Mendez' => ['Anuling Cerca I', 'Anuling Cerca II', 'Anuling Lejos I', 'Anuling Lejos II', 'Ayungon', 'Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Galicia I', 'Galicia II', 'Galicia III', 'Panungyan I', 'Panungyan II', 'Palocpoc I', 'Palocpoc II'],
        'Naic' => ['Bagong Karsada', 'Balsahan', 'Bancaan', 'Bucana Malaki', 'Bucana Sasahan', 'Calubcob I', 'Calubcob II', 'Capt. C. Nazareno', 'Gomez-Zamora', 'Halang', 'Humbac', 'Ibayo Estacion', 'Ibayo Silangan', 'Kanluran', 'Labac', 'Latoria', 'Mabolo', 'Makina', 'Malainen Bago', 'Malainen Luma', 'Molino', 'Munting Mapino', 'Palangue I', 'Palangue II', 'Palangue III', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Sabang', 'San Roque', 'Santulan', 'Sapa', 'Timalan Balsahan', 'Timalan Concepcion'],
        'Noveleta' => ['Magdiwang', 'Poblacion', 'Salcedo I', 'Salcedo II', 'San Antonio I', 'San Antonio II', 'San Jose I', 'San Jose II', 'San Juan I', 'San Juan II', 'San Rafael I', 'San Rafael II', 'San Rafael III', 'San Rafael IV', 'Santa Rosa I', 'Santa Rosa II'],
        'Rosario' => ['Bagbag I', 'Bagbag II', 'Kanluran', 'Ligtong I', 'Ligtong II', 'Ligtong III', 'Ligtong IV', 'Muzon I', 'Muzon II', 'Poblacion', 'Sapa I', 'Sapa II', 'Sapa III', 'Sapa IV', 'Silangan I', 'Silangan II', 'Wawa I', 'Wawa II', 'Wawa III'],
        'Silang' => ['Acacia', 'Adlas', 'Anahaw I', 'Anahaw II', 'Balite I', 'Balite II', 'Batas', 'Biga I', 'Biga II', 'Biluso', 'Bucal', 'Buho', 'Bulihan', 'Cabangaan', 'Carmen', 'Hoyo', 'Hukay', 'Iba', 'Inchican', 'Ipil I', 'Ipil II', 'Kalubkob', 'Kaong', 'Lalaan I', 'Lalaan II', 'Litlit', 'Lucsuhin', 'Lumil', 'Magallanes', 'Malabag', 'Mataas na Burol', 'Munting Ilog', 'Narra I', 'Narra II', 'Narra III', 'Paligawan', 'Pasong Langka', 'Pooc I', 'Pooc II', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V', 'Pulong Bunga', 'Pulong Saging', 'Puting Kahoy', 'Sabutan', 'San Miguel I', 'San Miguel II', 'San Vicente I', 'San Vicente II', 'Santol', 'Toledo', 'Tubuan I', 'Tubuan II', 'Tubuan III', 'Ulat', 'Yakal'],
        'Tanza' => ['Amaya I', 'Amaya II', 'Amaya III', 'Amaya IV', 'Amaya V', 'Amaya VI', 'Amaya VII', 'Bagtas', 'Biga', 'Biwas', 'Bucal', 'Bunga', 'Calibuyo', 'Capipisa', 'Daang Amaya I', 'Daang Amaya II', 'Daang Amaya III', 'Halayhay', 'Julugan I', 'Julugan II', 'Julugan III', 'Julugan IV', 'Julugan V', 'Julugan VI', 'Julugan VII', 'Julugan VIII', 'Mulawin', 'Navotas', 'Punta I', 'Punta II', 'Sahud Ulan', 'Sanja Mayor', 'Santol', 'Tanauan', 'Tres Cruses'],
        'Ternate' => ['Bucana', 'De Ocampo', 'Poblacion I', 'Poblacion II', 'Poblacion III', 'San Jose', 'San Juan I', 'San Juan II', 'Sapang I', 'Sapang II'],
    ];

    /**
     * Check if coordinates lie within Cavite geographic bounding box
     */
    public static function isWithinCaviteBounds(float $lat, float $lng): bool
    {
        return $lat >= self::BOUNDS['min_lat'] && $lat <= self::BOUNDS['max_lat']
            && $lng >= self::BOUNDS['min_lng'] && $lng <= self::BOUNDS['max_lng'];
    }

    /**
     * Determine whether a location (coordinates + optional province/city) is strictly in Cavite
     */
    public static function isCaviteLocation(float $lat, float $lng, ?string $province = null, ?string $city = null): bool
    {
        if (!self::isWithinCaviteBounds($lat, $lng)) {
            return false;
        }

        if ($province !== null && trim($province) !== '' && !self::isCaviteRegion($province)) {
            return false;
        }

        if ($city !== null && trim($city) !== '' && !self::isValidCity($city)) {
            return false;
        }

        if ($city !== null && self::isValidCity($city)) {
            return true;
        }

        if ($province !== null && self::isCaviteRegion($province)) {
            return true;
        }

        return true;
    }

    /**
     * Get official postal code for a Cavite city or municipality
     */
    public static function getPostalCodeForCity(?string $city): ?string
    {
        $canonical = self::resolveCanonicalCity($city);
        return $canonical ? (self::POSTAL_CODES[$canonical] ?? null) : null;
    }

    /**
     * Get official barangays for a Cavite city or municipality
     *
     * @return array<int, string>
     */
    public static function getBarangaysForCity(?string $city): array
    {
        $canonical = self::resolveCanonicalCity($city);
        return $canonical ? (self::BARANGAYS[$canonical] ?? []) : [];
    }

    /**
     * Match and resolve canonical barangay name in a Cavite city
     */
    public static function resolveCanonicalBarangay(?string $city, ?string $barangay): ?string
    {
        if ($barangay === null || trim($barangay) === '') {
            return null;
        }

        $barangays = self::getBarangaysForCity($city);
        if (empty($barangays)) {
            return trim($barangay);
        }

        $normalizedTarget = self::normalizeBarangay($barangay);

        foreach ($barangays as $canonical) {
            if (self::normalizeBarangay($canonical) === $normalizedTarget) {
                return $canonical;
            }
        }

        return trim($barangay);
    }

    /**
     * Normalize barangay name for resilient matching
     */
    public static function normalizeBarangay(?string $value): string
    {
        $cleaned = trim((string) $value);
        if ($cleaned === '') {
            return '';
        }

        $result = Str::of($cleaned)
            ->replace(['ñ', 'Ñ', 'Ã±', 'Ã‘'], 'n')
            ->ascii()
            ->lower()
            ->replaceMatches('/^(?:barangay|brgy\.?|bgy\.?)\s+/i', '')
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->value();

        $romanMap = [
            '/\bviii\b/i' => '8',
            '/\bvii\b/i' => '7',
            '/\bvi\b/i' => '6',
            '/\biv\b/i' => '4',
            '/\bv\b/i' => '5',
            '/\biii\b/i' => '3',
            '/\bii\b/i' => '2',
            '/\bi\b/i' => '1',
        ];

        return preg_replace(array_keys($romanMap), array_values($romanMap), $result) ?? $result;
    }

    /**
     * Find nearest Cavite city from coordinates using centroid Euclidean distance
     */
    public static function getNearestCity(float $lat, float $lng): string
    {
        $closestCity = 'Dasmariñas City';
        $minDist = PHP_FLOAT_MAX;

        foreach (self::CITY_COORDINATES as $key => $coords) {
            $dLat = $coords['lat'] - $lat;
            $dLng = $coords['lng'] - $lng;
            $dist = ($dLat * $dLat) + ($dLng * $dLng);
            if ($dist < $minDist) {
                $minDist = $dist;
                $closestCity = self::resolveCanonicalCity($key) ?? $closestCity;
            }
        }

        return $closestCity;
    }

    /**
     * Normalize text for accent-insensitive and suffix-tolerant comparison
     */
    public static function normalize(?string $value): string
    {
        $cleaned = trim((string) $value);
        if ($cleaned === '') {
            return '';
        }

        return Str::of($cleaned)
            ->replace(['ñ', 'Ñ', 'Ã±', 'Ã‘'], 'n')
            ->ascii()
            ->lower()
            ->replaceMatches('/,\s*cavite\s*$/i', '')
            ->replaceMatches('/^(?:city|municipality)\s+of\s+/i', '')
            ->replaceMatches('/\s+(?:city|municipality)$/i', '')
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->value();
    }

    /**
     * Verify if a given city string belongs to Cavite
     */
    public static function isValidCity(?string $city): bool
    {
        if ($city === null || trim($city) === '') {
            return false;
        }

        $normalizedInput = self::normalize($city);

        // Disambiguate 'Cavite' (province) from 'Cavite City' (city)
        if ($normalizedInput === 'cavite' && !preg_match('/\bcity\b/i', $city)) {
            return false;
        }

        foreach (self::CITIES as $validCity) {
            if (self::normalize($validCity) === $normalizedInput) {
                return true;
            }
        }

        return false;
    }

    /**
     * Resolve the canonical city name if valid
     */
    public static function resolveCanonicalCity(?string $city): ?string
    {
        if ($city === null || trim($city) === '') {
            return null;
        }

        $normalizedInput = self::normalize($city);

        // Disambiguate 'Cavite' (province) from 'Cavite City' (city)
        if ($normalizedInput === 'cavite' && !preg_match('/\bcity\b/i', $city)) {
            return null;
        }

        foreach (self::CITIES as $validCity) {
            if (self::normalize($validCity) === $normalizedInput) {
                return $validCity;
            }
        }

        return $city;
    }
}
