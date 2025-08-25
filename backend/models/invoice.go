package models

type InvoiceSchema struct {
	FaturaNo     string `json:"fatura_no" bson:"fatura_no"`
	FaturaTarihi string `json:"fatura_tarihi" bson:"fatura_tarihi"`
	Created_at   string `json:"created_at" bson:"created_at"`

	// Satıcı bilgileri
	SaticiUnvan string `json:"satici_unvan" bson:"satici_unvan"`
	SaticiVKN   string `json:"satici_vkn" bson:"satici_vkn"`
	SaticiAdres string `json:"satici_adres" bson:"satici_adres"`

	// Mal/Hizmet kalemleri
	Kalemler []Item `json:"kalemler" bson:"kalemler"`

	// Toplamlar
	AraToplam   float64 `json:"ara_toplam" bson:"ara_toplam"`
	KdvTutari   float64 `json:"kdv_tutari" bson:"kdv_tutari"`
	GenelToplam float64 `json:"genel_toplam" bson:"genel_toplam"`
}
type Item struct {
	Aciklama   string  `json:"aciklama" bson:"aciklama"`
	Miktar     float64 `json:"miktar" bson:"miktar"`
	BirimFiyat float64 `json:"birim_fiyat" bson:"birim_fiyat"`
	KdvOrani   float64 `json:"kdv_orani" bson:"kdv_orani"`
	Tutar      float64 `json:"tutar" bson:"tutar"`
}
