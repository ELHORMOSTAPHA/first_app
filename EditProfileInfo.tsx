import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";

import { useToast } from "../../../../hooks/use-toast";
import API from "../../../../utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
// import { ScrollArea } from "../../../../components/ui/scrollArea";
import { cn } from "../../../../lib/utils";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
  };

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    ({ className, onChange, ...props }, ref) => {
      return (
        <RPNInput.default
          ref={ref}
          className={cn("flex", className)}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={InputComponent}
          smartCaret={false}
          defaultCountry="MA" // Set Morocco as default country
          onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
          {...props}
        />
      );
    },
  );
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input
    className={cn(
      "h-14 rounded-e-2xl rounded-s-none border-black focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex h-14 gap-1 rounded-e-none rounded-s-2xl border-r-0 border-black px-3 focus:z-10"
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "-mr-2 size-4 opacity-50",
              disabled ? "hidden" : "opacity-100",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>

            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countryList.map(({ value, label }) =>
                value ? (
                  <CountrySelectOption
                    key={value}
                    country={value}
                    countryName={label}
                    selectedCountry={selectedCountry}
                    onChange={onChange}
                  />
                ) : null,
              )}
            </CommandGroup>

          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
}: CountrySelectOptionProps) => {
  return (
    <CommandItem className="gap-2" onSelect={() => onChange(country)}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-foreground/50 text-sm">
        {`+${RPNInput.getCountryCallingCode(country)}`}
      </span>
      <CheckIcon
        className={cn(
          "ml-auto size-4",
          country === selectedCountry ? "opacity-100" : "opacity-0",
        )}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="bg-foreground/20 flex h-4 w-6 overflow-hidden rounded-sm [&_svg]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

interface FormData {
  first_name: string;
  last_name: string;
  gender: number;
  dob: string;
  profile_img_url: string;
  mobile_no: string;
  email_address: string;
  bio: string
}

interface EditProfileInfoDialogProps {
  press: ReactNode;
  refetch: () => void;
  item: {
    id: number;
    first_name: string;
    last_name: string;
    user_gender: { title: string };
    gender: number;
    dob: string;
    profile_img_url: string;
    mobile_no: string;
  };
}

const EditProfileInfoDialog = ({
  press,
  refetch,
  item,
}: EditProfileInfoDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [genders, setGenders] = useState<Array<any>>([]);
  const [selectedGender, setSelectGender] = useState<string>("Select Gender");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [uploadImage, setUploadImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isInputVisible, setInputVisible] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    gender: 0,
    dob: "",
    profile_img_url: "",
    mobile_no: "",
    email_address: "",
    bio: ""
  });

  useEffect(() => {
    if (item) {
      setFormData({
        first_name: item.first_name || "",
        last_name: item.last_name || "",
        gender: item.gender,
        dob: item.dob,
        profile_img_url: item.profile_img_url || "",
        mobile_no: item.mobile_no || "",
        email_address: item.email_address || "",
        bio: item.bio || "",
      });
      setSelectGender(item?.user_gender?.title);
      setImagePreview(item?.profile_img_url || null);
      setIsImageSelected(!!item?.profile_img_url);
    }
  }, [item]);

  useEffect(() => {
    const fetchGenderData = async () => {
      const { data } = await API.get("/gender/get");
      setGenders(data?.data);
    };
    fetchGenderData();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setIsImageSelected(true);
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_for", "profile");
      try {
        const { data } = await API.post("/upload/single", formData);
        const response = data?.data;

        if (data.success) {
          toast({
            title: "Image Upload Successful",
            description: "Your profile image has been uploaded.",
          });
          setUploadImage(response?.fileUrl);
          setFormData((prev) => ({ ...prev, profile_img_url: response?.fileUrl }));
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          toast({
            title: "Image Upload Failed",
            description: data.message || "Something went wrong while uploading the image.",
          });
        }
      } catch (err) {
        toast({
          title: "Error",
          description: `An error occurred while uploading the image: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
      setInputVisible(false);
    }
  };

  const handleDeletePreview = () => {
    setImagePreview(null);
    setIsImageSelected(false);
    setUploadImage("");
    setFormData((prev) => ({ ...prev, profile_img_url: "" }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const { mutate: updateProfileInfo, isLoading } = useMutation({
    mutationFn: async (payload: Partial<FormData>) => {
      const { data } = await API.put(`/user/update/${item?.id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Success!",
          description: "Profile Info updated successfully.",
        });
        refetch();
        setIsOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Failed!",
          description: data.message || "Something went wrong.",
        });
      }
    },
    onError: (error) => {
      console.error("Error updating Personal Info : ", error);
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Failed to update Profile Info.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.dob) {
      toast({
        variant: "destructive",
        title: "Validation Error!",
        description: "First name, last name, and date of birth are required.",
      });
      return;
    }

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      gender: formData.gender,
      dob: formData.dob,
      profile_img_url: uploadImage || formData.profile_img_url,
      mobile_no: formData.mobile_no,
      bio: formData.bio,
    };

    updateProfileInfo(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{press}</DialogTrigger>
      {/* responsive code */}
      <DialogContent
        aria-describedby={undefined}
        className="ml-0 mt-4 w-full max-w-[720px] max-h-[90vh] overflow-auto bg-white p-4 sm:ml-6 sm:mt-8 sm:p-8"
      >
        <DialogHeader>
          <DialogTitle className="text-[18px] font-bold text-black">
            Update Profile Info
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-y-6 sm:gap-y-8"
          onSubmit={handleSubmit}
        >
          {/* Example: Make image and fields stack on mobile, side-by-side on larger screens */}
          <div className="flex flex-col sm:flex-row sm:gap-x-8 gap-y-6">
            <div className="flex-1 flex flex-col gap-y-3">
              <label className="text-[14px] leading-[1.3]">First Name</label>
              <Input
                value={formData.first_name}
                onChange={handleInputChange}
                type="text"
                name="first_name"
                placeholder="First Name"
                className="h-[54px] rounded-xl border-none bg-[#F4F4F4] text-[14px] focus:ring-black"
              />
            </div>
            <div className="flex-1 flex flex-col gap-y-3">
              <label className="text-[14px] leading-[1.3]">Last Name</label>
              <Input
                value={formData.last_name}
                onChange={handleInputChange}
                type="text"
                name="last_name"
                placeholder="Last Name"
                className="h-[54px] rounded-xl border-none bg-[#F4F4F4] text-[14px] focus:ring-black"
              />
            </div>
          </div>
          {/* Profile Image and Bio on the same line */}
          <div className="flex flex-col sm:flex-row gap-y-6 sm:gap-x-8">
            {/* Profile Image */}
            <div className="flex flex-col gap-y-3 items-center sm:items-start sm:w-[220px]">
              <label htmlFor="image" className="text-[14px] leading-[1.3]">
                Profile Image
              </label>
              <div className="flex h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] flex-col items-center justify-center rounded-[24px] bg-[#F4F4F4]">
                {/* ...existing image upload code... */}
                {/* Keep your image upload logic here */}
                {/* ... */}
              </div>
            </div>
            {/* Bio */}
            <div className="flex-1 flex flex-col gap-y-3">
              <label className="text-[14px] leading-[1.3]">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                name="bio"
                placeholder="Write something about yourself..."
                className="h-[180px] sm:h-full rounded-xl border-none bg-[#F4F4F4] text-[14px] p-3 focus:ring-black resize-none"
                maxLength={300}
              />
            </div>
          </div>
          {/* Profile Image */}
          <div className="flex flex-col gap-y-3 items-center sm:items-start">
            <label htmlFor="image" className="text-[14px] leading-[1.3]">
              Profile Image
            </label>
            <div className="flex h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] flex-col items-center justify-center rounded-[24px] bg-[#F4F4F4]">
              {!isImageSelected ? (
                <div className="relative h-full w-full" onClick={handleClick}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    id="image"
                    name="image"
                    onChange={handleFileChange}
                    className={`h-[200px] w-[200px] cursor-pointer rounded-xl opacity-0 focus:ring-black ${isInputVisible ? "" : "hidden"}`}
                  />
                  <div className="absolute left-2 top-5 flex h-full w-full flex-col items-center justify-center">
                    <span>
                      <svg
                        width="65"
                        height="55"
                        viewBox="0 0 65 55"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M33.5568 29.5684L33.6624 29.6212H33.7804C33.7802 29.6212 33.7802 29.6212 33.7806 29.6213C33.785 29.6219 33.8384 29.6297 33.9604 29.7212C34.0864 29.8157 34.2203 29.9482 34.3868 30.1148L40.7868 36.5148C41.8716 37.5995 41.8716 39.2029 40.7868 40.2877C40.2467 40.8278 39.4167 41.1012 38.9004 41.1012C38.3841 41.1012 37.554 40.8278 37.0139 40.2877L36.0539 39.3277L35.2004 38.4741V39.6812V51.2012C35.2004 52.0476 34.9204 52.7141 34.4668 53.1677C34.0132 53.6213 33.3468 53.9012 32.5004 53.9012C31.654 53.9012 30.9876 53.6213 30.5339 53.1677C30.0803 52.7141 29.8004 52.0476 29.8004 51.2012V39.6812V38.4741L28.9468 39.3277L27.9868 40.2877C26.9021 41.3724 25.2987 41.3724 24.2139 40.2877L23.8604 40.6412L24.2139 40.2877C23.1292 39.2029 23.1292 37.5995 24.2139 36.5148L30.6139 30.1148C30.7109 30.0178 30.8042 29.9683 30.964 29.8884C30.9678 29.8865 30.9717 29.8846 30.9757 29.8826C31.1118 29.8146 31.293 29.7241 31.4786 29.5635C32.3262 29.3024 33.0953 29.3377 33.5568 29.5684Z"
                          fill="#137AA8"
                          stroke="#F4F4F4"
                        />
                        <path
                          d="M56.3604 18.117L56.4356 18.2924L56.6086 18.3731C61.2194 20.5248 64 25.1394 64 30.4C64 34.1385 62.7537 37.8255 60.0078 40.2663C57.2009 42.7613 53.795 44.3 50.1 44.3C49.2536 44.3 48.5872 44.0201 48.1336 43.5664C47.6799 43.1128 47.4 42.4464 47.4 41.6C47.4 40.7536 47.6799 40.0872 48.1336 39.6336C48.5872 39.1799 49.2536 38.9 50.1 38.9C52.4471 38.9 54.5032 38.2239 56.2136 36.5136L56.2331 36.494L56.2504 36.4723C57.574 34.8179 58.6 32.7908 58.6 30.4C58.6 27.0137 56.5781 23.9685 53.5429 22.6009C52.6481 21.9993 52.121 21.4419 51.8543 20.6419C51.1927 18.657 50.1946 16.9875 48.8536 15.6464L48.84 15.6329L48.8254 15.6204C46.5153 13.6403 43.5239 12.3 40.5 12.3H40.491C39.5292 12.3 38.5185 12.3 37.1787 12.6349C36.0231 12.9238 34.7429 12.6033 34.2419 11.6451C33.8805 10.5931 33.1775 9.89024 32.5598 9.27264L32.5336 9.24645C28.1783 4.89118 20.5017 4.89118 16.1464 9.24645L16.1329 9.26003L16.1204 9.2746C14.1403 11.5847 12.8 14.5761 12.8 17.6V19.52V19.5695L12.8097 19.6181C13.0722 20.9306 12.3024 22.0198 11.1564 22.5928L11.38 23.04L11.1564 22.5928C10.477 22.9325 9.47076 23.6021 8.78645 24.2864L8.76686 24.306L8.74957 24.3277C7.42604 25.9821 6.4 28.0092 6.4 30.4C6.4 35.1561 10.1439 38.9 14.9 38.9C15.7464 38.9 16.4128 39.1799 16.8664 39.6336C17.3201 40.0872 17.6 40.7536 17.6 41.6C17.6 42.4464 17.3201 43.1128 16.8664 43.5664C16.4128 44.0201 15.7464 44.3 14.9 44.3C7.16881 44.3 1 38.1166 1 30.72C1 26.9815 2.24634 23.2945 4.99218 20.8537L5.04031 20.8109L5.07603 20.7573C5.34455 20.3546 5.68449 20.0772 6.06673 19.8096C6.14365 19.7558 6.22544 19.7005 6.31002 19.6433C6.62094 19.4332 6.96964 19.1975 7.25355 18.9136L7.4 18.7671V18.56V17.6C7.4 12.9332 9.26694 8.58017 12.3736 5.47355C15.4802 2.36694 19.8332 0.5 24.5 0.5C29.1698 0.5 33.4998 2.36717 36.273 5.75662L36.2888 5.77592L36.3064 5.79355C36.4115 5.89861 36.5347 5.99595 36.6443 6.08064C36.6702 6.10065 36.6956 6.12017 36.7207 6.13944C36.8092 6.20743 36.8937 6.27227 36.9799 6.34411C37.1974 6.52532 37.3775 6.71294 37.4928 6.94361L37.6498 7.25759L37.9984 7.21658C43.2851 6.59461 48.5737 8.4608 52.3064 12.1936L52.3225 12.2096L52.3399 12.2241C54.1711 13.7501 55.4128 15.9059 56.3604 18.117Z"
                          fill="#137AA8"
                          stroke="#F4F4F4"
                        />
                      </svg>
                    </span>
                    <span className="mt-3 flex gap-x-1 text-[14px]">
                      <p>Drag and drop Or </p>
                      <p className="font-bold text-[#137AA8]">Upload File</p>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative h-full w-full">
                  <img
                    src={imagePreview ? imagePreview : ""}
                    alt="image preview"
                    className="relative h-full w-full rounded-[24px] object-cover object-center"
                  />
                  <span
                    className="absolute right-3 top-3 cursor-pointer"
                    onClick={handleDeletePreview}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 40 40"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="40" height="40" rx="12" fill="#FF2022" />
                      <path
                        d="M12.7793 18.4374L13.3342 26.2057C13.4251 27.4784 14.3536 28.5467 15.6183 28.7156C18.4544 29.0947 21.2796 29.0947 24.1157 28.7156C25.3803 28.5467 26.3088 27.4784 26.3998 26.2057L26.9547 18.4374"
                        stroke="white"
                        strokeWidth="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M11 15.0092H28.7192"
                        stroke="white"
                        strokeWidth="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M16.3086 14.8982L16.9995 12.9983C17.4357 11.7986 18.5759 11 19.8524 11C21.129 11 22.2691 11.7986 22.7054 12.9983L23.3963 14.8982"
                        stroke="white"
                        strokeWidth="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Bio */}
          <div className="flex flex-col gap-y-3">
            <label className="text-[14px] leading-[1.3]">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              name="bio"
              placeholder="Write something about yourself..."
              className="h-[80px] rounded-xl border-none bg-[#F4F4F4] text-[14px] p-3 focus:ring-black resize-none"
              maxLength={300}
            />
          </div>
          {/* Mobile Number and Email */}
          <div className="flex flex-col sm:flex-row gap-y-6 sm:gap-x-8">
            <div className="flex-1 flex flex-col gap-y-3">
              <label className="text-[14px] leading-[1.3]">Mobile Number</label>
              <PhoneInput
                value={formData.mobile_no as RPNInput.Value}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, mobile_no: value || "" }))
                }
                placeholder="Mobile Number"
                className="h-[54px] rounded-xl border-none bg-[#F4F4F4] text-[14px] focus:ring-black"
              />
            </div>
            <div className="flex-1 flex flex-col gap-y-3">
              <label className="text-[14px] leading-[1.3]">Email</label>
              <Input
                value={formData.email_address}
                onChange={handleInputChange}
                type="email"
                name="email"
                placeholder="Email"
                readOnly
                className="h-[54px] rounded-xl border-none bg-[#F4F4F4] text-[14px] focus:ring-black"
              />
            </div>
          </div>
          {/* Gender and DOB */}
          <div className="flex flex-col sm:flex-row gap-y-6 sm:gap-x-8">
            <div className="flex-1 flex flex-col items-start gap-y-3">
              <label htmlFor="gender" className="text-[14px] leading-[1.3]">
                Gender
              </label>
              <Select
                onValueChange={(value) => {
                  setFormData({ ...formData, gender: Number(value) });
                }}
              >
                <SelectTrigger className="h-[54px] rounded-xl border-none bg-[#F4F4F4] text-[14px] focus:ring-black">
                  <SelectValue placeholder={selectedGender}>
                    {
                      (gender) => gender?.title && selectedGender && gender.title.toString() === selectedGender.toString()
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectGroup>
                    {genders?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 flex flex-col gap-y-3">
              <label className="text-[14px] leading-[1.3]">Date of Birth</label>
              <Input
                type="date"
                value={
                  formData.dob ? dayjs(formData.dob).format("YYYY-MM-DD") : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dob: dayjs(e.target.value).format("YYYY-MM-DD"),
                  })
                }
                className="h-[54px] rounded-xl border-none bg-[#F4F4F4] text-[14px] focus:ring-black"
              />
            </div>
          </div>
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Button
              type="button"
              className="h-[54px] flex-1 rounded-[12px] border-2 border-[#137AA8] bg-white text-[#137AA8] hover:bg-[#137AA8] hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-[54px] flex-1 rounded-[12px] border-2 bg-[#137AA8] text-white hover:bg-white hover:text-[#137AA8]"
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileInfoDialog;